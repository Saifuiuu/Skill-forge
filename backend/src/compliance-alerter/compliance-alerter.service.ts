import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { AiService } from '../ai/ai.service';
import { Course } from '../courses/entities/course.entity';
import { Enrolment, EnrolmentStatus } from '../enrolments/entities/enrolment.entity';
import { User, UserRole } from '../users/entities/user.entity';
import {
  ComplianceAlertBatch,
  ComplianceAlertDraft,
  CourseRiskItem,
} from './interfaces/alert-batch.interface';

interface AiEmailPayload {
  subject: string;
  body: string;
}

const ALERT_EMAIL_SYSTEM_PROMPT = `You are SkillForge's compliance communications writer.
Draft a short, professional reminder email for an employee with incomplete mandatory training due soon.
Rules:
- Be clear, polite, and actionable.
- Mention each at-risk course and its deadline.
- Do not invent courses or deadlines.
- Keep body under 220 words.
Output JSON:
{ "subject": "string", "body": "string" }`;

const LOOKAHEAD_DAYS = 14;

@Injectable()
export class ComplianceAlerterService {
  private readonly logger = new Logger(ComplianceAlerterService.name);
  private readonly batches = new Map<string, ComplianceAlertBatch>();

  constructor(
    private readonly aiService: AiService,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Course)
    private readonly coursesRepo: Repository<Course>,
    @InjectRepository(Enrolment)
    private readonly enrolmentsRepo: Repository<Enrolment>,
  ) {}

  @Cron('0 8 * * 1')
  async handleWeeklyCron(): Promise<void> {
    this.logger.log('Weekly compliance risk alerter cron starting (Monday 08:00)');
    try {
      const batch = await this.generateBatch('cron');
      this.logger.log(
        `Cron generated batch ${batch.id} with ${batch.drafts.length} reminder draft(s)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Cron compliance alerter failed: ${message}`);
    }
  }

  async runManually(): Promise<ComplianceAlertBatch> {
    return this.generateBatch('manual');
  }

  listBatches(): ComplianceAlertBatch[] {
    return [...this.batches.values()].sort(
      (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
    );
  }

  getBatch(batchId: string): ComplianceAlertBatch {
    const batch = this.batches.get(batchId);
    if (!batch) {
      throw new NotFoundException('Alert batch not found');
    }
    return batch;
  }

  async sendBatch(batchId: string, draftIds?: string[]): Promise<ComplianceAlertBatch> {
    const batch = this.getBatch(batchId);
    const selected = new Set(draftIds);
    let sentCount = 0;

    for (const draft of batch.drafts) {
      if (draft.status !== 'DRAFT') {
        continue;
      }
      if (draftIds?.length && !selected.has(draft.draftId)) {
        continue;
      }

      this.logger.log(
        `[MOCK EMAIL SEND] to=${draft.employeeEmail} subject="${draft.subject}" courses=${draft.coursesAtRisk
          .map((c) => c.courseTitle)
          .join(', ')}`,
      );
      this.logger.debug(`[MOCK EMAIL BODY]\n${draft.body}`);
      draft.status = 'SENT';
      sentCount++;
    }

    batch.sentAt = new Date().toISOString();
    this.batches.set(batchId, batch);
    this.logger.log(`Mock-sent ${sentCount} reminder(s) from batch ${batchId}`);
    return batch;
  }

  private async generateBatch(trigger: 'cron' | 'manual'): Promise<ComplianceAlertBatch> {
    const atRisk = await this.findEmployeesAtRisk();
    const drafts: ComplianceAlertDraft[] = [];
    let aiUsed = false;
    let fallbackUsed = false;
    let fallbackReason: string | undefined;

    for (const item of atRisk) {
      const email = await this.draftEmail(item.employee, item.courses);
      drafts.push(email.draft);
      if (email.usedAi) {
        aiUsed = true;
      } else {
        fallbackUsed = true;
        fallbackReason = email.fallbackReason ?? fallbackReason;
      }
    }

    const source: ComplianceAlertBatch['source'] =
      aiUsed && fallbackUsed ? 'mixed' : aiUsed ? 'ai' : 'fallback';

    const batch: ComplianceAlertBatch = {
      id: randomUUID(),
      generatedAt: new Date().toISOString(),
      source,
      trigger,
      fallbackReason:
        source === 'ai'
          ? undefined
          : fallbackReason ??
            (this.aiService.isDisabled()
              ? 'AI_DISABLED flag is set'
              : 'AI drafting unavailable; using static reminder templates'),
      drafts,
    };

    this.batches.set(batch.id, batch);
    return batch;
  }

  private async findEmployeesAtRisk(): Promise<
    Array<{ employee: User; courses: CourseRiskItem[] }>
  > {
    const now = new Date();
    const horizon = new Date(now.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);

    const mandatoryCourses = await this.coursesRepo
      .createQueryBuilder('course')
      .where('course.isLatestVersion = true')
      .andWhere('course.isMandatory = true')
      .andWhere('course.regulatoryDeadline IS NOT NULL')
      .andWhere('course.regulatoryDeadline <= :horizon', {
        horizon: horizon.toISOString().split('T')[0],
      })
      .getMany();

    if (!mandatoryCourses.length) {
      return [];
    }

    const employees = await this.usersRepo.find({
      where: { role: UserRole.EMPLOYEE },
      relations: { team: { department: true } },
    });

    const enrolments = await this.enrolmentsRepo.find({
      where: {
        course: { id: In(mandatoryCourses.map((c) => c.id)) },
      },
      relations: { employee: true, course: true },
    });

    const enrolmentMap = new Map(
      enrolments.map((e) => [`${e.employee.id}:${e.course.id}`, e]),
    );

    const results: Array<{ employee: User; courses: CourseRiskItem[] }> = [];

    for (const employee of employees) {
      const departmentId = employee.team?.department?.id;
      const relevantCourses = mandatoryCourses.filter((course) => {
        if (!course.departmentIds?.length) {
          return true;
        }
        return departmentId ? course.departmentIds.includes(departmentId) : false;
      });

      const coursesAtRisk: CourseRiskItem[] = [];
      for (const course of relevantCourses) {
        const enrolment = enrolmentMap.get(`${employee.id}:${course.id}`);
        if (enrolment?.status === EnrolmentStatus.PASSED) {
          continue;
        }

        const deadline = course.regulatoryDeadline
          ? new Date(course.regulatoryDeadline)
          : null;
        const daysUntilDeadline = deadline
          ? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        coursesAtRisk.push({
          courseId: course.id,
          courseTitle: course.title,
          regulatoryDeadline: deadline
            ? deadline.toISOString().split('T')[0]
            : null,
          daysUntilDeadline,
          enrolmentStatus: enrolment?.status ?? 'NOT_ENROLLED',
          progressPercentage: enrolment?.progressPercentage ?? 0,
        });
      }

      if (coursesAtRisk.length) {
        coursesAtRisk.sort((a, b) => {
          if (a.daysUntilDeadline == null) return 1;
          if (b.daysUntilDeadline == null) return -1;
          return a.daysUntilDeadline - b.daysUntilDeadline;
        });
        results.push({ employee, courses: coursesAtRisk });
      }
    }

    return results;
  }

  private async draftEmail(
    employee: User,
    courses: CourseRiskItem[],
  ): Promise<{ draft: ComplianceAlertDraft; usedAi: boolean; fallbackReason?: string }> {
    const courseLines = courses
      .map(
        (c) =>
          `- ${c.courseTitle} (deadline: ${c.regulatoryDeadline ?? 'N/A'}, status: ${c.enrolmentStatus}, progress: ${c.progressPercentage}%)`,
      )
      .join('\n');

    const { data, result } = await this.aiService.completeJson<AiEmailPayload>(
      ALERT_EMAIL_SYSTEM_PROMPT,
      `Employee name: ${employee.fullName}
Employee email: ${employee.email}
At-risk mandatory courses due within ${LOOKAHEAD_DAYS} days:
${courseLines}`,
      { maxTokens: 800 },
    );

    let subject: string;
    let body: string;
    let usedAi = false;
    let fallbackReason: string | undefined;

    if (data?.subject && data?.body) {
      subject = data.subject.trim();
      body = data.body.trim();
      usedAi = !result.usedFallback;
    } else {
      const fallback = this.buildFallbackEmail(employee, courses);
      subject = fallback.subject;
      body = fallback.body;
      usedAi = false;
      fallbackReason = result.usedFallback
        ? result.reason
        : 'Invalid AI email payload; using static template';
    }

    return {
      usedAi,
      fallbackReason,
      draft: {
        draftId: randomUUID(),
        employeeId: employee.id,
        employeeName: employee.fullName,
        employeeEmail: employee.email,
        subject,
        body,
        coursesAtRisk: courses,
        status: 'DRAFT',
        usedAi,
      },
    };
  }

  private buildFallbackEmail(
    employee: User,
    courses: CourseRiskItem[],
  ): { subject: string; body: string } {
    const titles = courses.map((c) => c.courseTitle).join(', ');
    const courseList = courses
      .map(
        (c) =>
          `• ${c.courseTitle} — due ${c.regulatoryDeadline ?? 'soon'} (${c.enrolmentStatus}, ${c.progressPercentage}% complete)`,
      )
      .join('\n');

    return {
      subject: `Action required: complete mandatory training (${titles})`,
      body: `Dear ${employee.fullName},

This is a reminder that you have incomplete mandatory training due within the next ${LOOKAHEAD_DAYS} days:

${courseList}

Please log in to SkillForge and complete the remaining modules and quizzes before the regulatory deadline.

If you need an extra quiz attempt or support, contact your manager.

Kind regards,
SkillForge Compliance Team`,
    };
  }
}

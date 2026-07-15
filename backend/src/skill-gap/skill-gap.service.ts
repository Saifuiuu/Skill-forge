import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { Course } from '../courses/entities/course.entity';
import { Enrolment, EnrolmentStatus } from '../enrolments/entities/enrolment.entity';
import { Team } from '../teams/entities/team.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { AnalyzeSkillGapDto } from './dto/analyze-skill-gap.dto';
import {
  IndividualBreakdownDto,
  IndividualSkillStatusDto,
  SkillCoverageStatus,
  SkillGapAnalysisResponseDto,
  TeamSkillSummaryDto,
} from './dto/skill-gap-response.dto';

interface AiSkillGapPayload {
  summary?: string;
  priorityOrder?: string[];
  teamRationale?: Array<{ courseId: string; rationale: string }>;
}

const SKILL_GAP_SYSTEM_PROMPT = `You are SkillForge's skill gap analyst for corporate training managers.
You receive a team completion table for a competency framework (required courses).
Rules:
- Use ONLY the provided course IDs.
- Suggest a priorityOrder of courseIds ranked by deadline urgency first, then by how many employees are MISSING the skill.
- Optionally add a short rationale per course explaining team risk.
- Do not invent courses or employees.
Output JSON shape:
{
  "summary": "string",
  "priorityOrder": ["uuid", "..."],
  "teamRationale": [{ "courseId": "uuid", "rationale": "string" }]
}`;

@Injectable()
export class SkillGapService {
  constructor(
    private readonly aiService: AiService,
    @InjectRepository(Team)
    private readonly teamsRepo: Repository<Team>,
    @InjectRepository(Course)
    private readonly coursesRepo: Repository<Course>,
    @InjectRepository(Enrolment)
    private readonly enrolmentsRepo: Repository<Enrolment>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async analyze(
    requesterId: string,
    requesterRole: UserRole,
    dto: AnalyzeSkillGapDto,
  ): Promise<SkillGapAnalysisResponseDto> {
    const team = await this.teamsRepo.findOne({
      where: { id: dto.teamId },
      relations: { members: true, department: true },
    });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    await this.assertCanAnalyseTeam(requesterId, requesterRole, team);

    const courses = await this.coursesRepo.find({
      where: { id: In(dto.requiredCourseIds), isLatestVersion: true },
    });
    if (!courses.length) {
      throw new NotFoundException('None of the required courses were found');
    }

    const courseMap = new Map(courses.map((c) => [c.id, c]));
    const orderedCourses = this.sortByDeadlineUrgency(
      dto.requiredCourseIds
        .map((id) => courseMap.get(id))
        .filter((c): c is Course => Boolean(c)),
    );

    const employees = team.members.filter((m) => m.role === UserRole.EMPLOYEE);
    const enrolments = employees.length
      ? await this.enrolmentsRepo.find({
          where: {
            employee: { id: In(employees.map((e) => e.id)) },
            course: { id: In(orderedCourses.map((c) => c.id)) },
          },
          relations: { employee: true, course: true },
        })
      : [];

    const enrolmentKey = (employeeId: string, courseId: string) =>
      `${employeeId}:${courseId}`;
    const enrolmentMap = new Map(
      enrolments.map((e) => [enrolmentKey(e.employee.id, e.course.id), e]),
    );

    const individualBreakdown = employees.map((employee) =>
      this.buildIndividualBreakdown(employee, orderedCourses, enrolmentMap),
    );

    const teamSummary = orderedCourses.map((course, index) =>
      this.buildTeamSkillSummary(course, individualBreakdown, index + 1),
    );

    const fallbackPriority = orderedCourses.map((c) => c.id);
    const aiEnhancement = await this.tryAiEnhancement({
      frameworkName: dto.frameworkName,
      teamName: team.name,
      teamSummary,
      individualBreakdown,
      fallbackPriority,
    });

    const priorityOrder = aiEnhancement?.priorityOrder ?? fallbackPriority;
    const rationaleMap = new Map(
      (aiEnhancement?.teamRationale ?? []).map((r) => [r.courseId, r.rationale]),
    );

    const prioritizedSummary = this.reorderTeamSummary(teamSummary, priorityOrder).map(
      (item) => ({
        ...item,
        aiRationale: rationaleMap.get(item.courseId),
      }),
    );

    return {
      source: aiEnhancement ? 'ai' : 'fallback',
      teamId: team.id,
      teamName: team.name,
      frameworkName: dto.frameworkName,
      teamSize: employees.length,
      teamSummary: prioritizedSummary,
      individualBreakdown: individualBreakdown.map((row) => ({
        ...row,
        skills: this.reorderIndividualSkills(row.skills, priorityOrder),
      })),
      priorityOrder,
      summary:
        aiEnhancement?.summary ??
        'Skill gap report built from enrolment completion data, ordered by regulatory deadline urgency.',
      fallbackReason: aiEnhancement
        ? undefined
        : this.aiService.isDisabled()
          ? 'AI_DISABLED flag is set'
          : 'AI ranking unavailable; using plain completion table ordered by deadline urgency',
    };
  }

  private async assertCanAnalyseTeam(
    requesterId: string,
    requesterRole: UserRole,
    team: Team,
  ): Promise<void> {
    if (requesterRole === UserRole.HR_ADMIN) {
      return;
    }
    if (requesterRole !== UserRole.MANAGER) {
      throw new ForbiddenException('Only managers or HR admins can run skill gap analysis');
    }

    const manager = await this.usersRepo.findOne({
      where: { id: requesterId },
      relations: { team: true },
    });
    if (!manager?.team || manager.team.id !== team.id) {
      throw new ForbiddenException('Managers can only analyse their own team');
    }
  }

  private classifyCoverage(enrolment: Enrolment | undefined): SkillCoverageStatus {
    if (!enrolment) {
      return 'MISSING';
    }
    if (enrolment.status === EnrolmentStatus.PASSED) {
      return 'COVERED';
    }
    return 'PARTIALLY_COVERED';
  }

  private buildIndividualBreakdown(
    employee: User,
    courses: Course[],
    enrolmentMap: Map<string, Enrolment>,
  ): IndividualBreakdownDto {
    const skills: IndividualSkillStatusDto[] = courses.map((course, index) => {
      const enrolment = enrolmentMap.get(`${employee.id}:${course.id}`);
      const coverage = this.classifyCoverage(enrolment);
      return {
        courseId: course.id,
        courseTitle: course.title,
        coverage,
        enrolmentStatus: enrolment?.status ?? 'NOT_ENROLLED',
        progressPercentage: enrolment?.progressPercentage ?? 0,
        regulatoryDeadline: course.regulatoryDeadline
          ? new Date(course.regulatoryDeadline).toISOString().split('T')[0]
          : null,
        urgencyRank: index + 1,
      };
    });

    return {
      employeeId: employee.id,
      employeeName: employee.fullName,
      coveredCount: skills.filter((s) => s.coverage === 'COVERED').length,
      partiallyCoveredCount: skills.filter((s) => s.coverage === 'PARTIALLY_COVERED').length,
      missingCount: skills.filter((s) => s.coverage === 'MISSING').length,
      skills,
    };
  }

  private buildTeamSkillSummary(
    course: Course,
    individuals: IndividualBreakdownDto[],
    urgencyRank: number,
  ): TeamSkillSummaryDto {
    const statuses = individuals.map(
      (person) => person.skills.find((s) => s.courseId === course.id)?.coverage ?? 'MISSING',
    );
    const coveredCount = statuses.filter((s) => s === 'COVERED').length;
    const partiallyCoveredCount = statuses.filter((s) => s === 'PARTIALLY_COVERED').length;
    const missingCount = statuses.filter((s) => s === 'MISSING').length;
    const teamSize = individuals.length;

    let teamCoverage: SkillCoverageStatus = 'MISSING';
    if (teamSize > 0 && coveredCount === teamSize) {
      teamCoverage = 'COVERED';
    } else if (coveredCount > 0 || partiallyCoveredCount > 0) {
      teamCoverage = 'PARTIALLY_COVERED';
    }

    return {
      courseId: course.id,
      courseTitle: course.title,
      teamCoverage,
      coveredCount,
      partiallyCoveredCount,
      missingCount,
      teamSize,
      regulatoryDeadline: course.regulatoryDeadline
        ? new Date(course.regulatoryDeadline).toISOString().split('T')[0]
        : null,
      urgencyRank,
    };
  }

  private sortByDeadlineUrgency(courses: Course[]): Course[] {
    return [...courses].sort((a, b) => {
      if (!a.regulatoryDeadline && !b.regulatoryDeadline) {
        return a.title.localeCompare(b.title);
      }
      if (!a.regulatoryDeadline) return 1;
      if (!b.regulatoryDeadline) return -1;
      return (
        new Date(a.regulatoryDeadline).getTime() - new Date(b.regulatoryDeadline).getTime()
      );
    });
  }

  private reorderTeamSummary(
    summary: TeamSkillSummaryDto[],
    priorityOrder: string[],
  ): TeamSkillSummaryDto[] {
    const map = new Map(summary.map((item) => [item.courseId, item]));
    const ordered: TeamSkillSummaryDto[] = [];
    priorityOrder.forEach((id, index) => {
      const item = map.get(id);
      if (item) {
        ordered.push({ ...item, urgencyRank: index + 1 });
        map.delete(id);
      }
    });
    for (const remaining of map.values()) {
      ordered.push({ ...remaining, urgencyRank: ordered.length + 1 });
    }
    return ordered;
  }

  private reorderIndividualSkills(
    skills: IndividualSkillStatusDto[],
    priorityOrder: string[],
  ): IndividualSkillStatusDto[] {
    const map = new Map(skills.map((s) => [s.courseId, s]));
    const ordered: IndividualSkillStatusDto[] = [];
    priorityOrder.forEach((id, index) => {
      const skill = map.get(id);
      if (skill) {
        ordered.push({ ...skill, urgencyRank: index + 1 });
        map.delete(id);
      }
    });
    for (const remaining of map.values()) {
      ordered.push({ ...remaining, urgencyRank: ordered.length + 1 });
    }
    return ordered;
  }

  private async tryAiEnhancement(context: {
    frameworkName?: string;
    teamName: string;
    teamSummary: TeamSkillSummaryDto[];
    individualBreakdown: IndividualBreakdownDto[];
    fallbackPriority: string[];
  }): Promise<AiSkillGapPayload | null> {
    if (!context.teamSummary.length) {
      return null;
    }

    const userPrompt = `Framework: ${context.frameworkName ?? 'Unnamed competency framework'}
Team: ${context.teamName}
Team skill table:
${JSON.stringify(context.teamSummary, null, 2)}
Individual snapshot (counts only):
${JSON.stringify(
  context.individualBreakdown.map((p) => ({
    employeeId: p.employeeId,
    employeeName: p.employeeName,
    coveredCount: p.coveredCount,
    partiallyCoveredCount: p.partiallyCoveredCount,
    missingCount: p.missingCount,
  })),
  null,
  2,
)}
Default deadline priorityOrder: ${JSON.stringify(context.fallbackPriority)}`;

    const { data } = await this.aiService.completeJson<AiSkillGapPayload>(
      SKILL_GAP_SYSTEM_PROMPT,
      userPrompt,
      { maxTokens: 2000 },
    );

    if (!data) {
      return null;
    }

    const allowed = new Set(context.fallbackPriority);
    const priorityOrder = (data.priorityOrder ?? [])
      .filter((id) => allowed.has(id))
      .concat(context.fallbackPriority.filter((id) => !(data.priorityOrder ?? []).includes(id)));

    if (!priorityOrder.length) {
      return null;
    }

    return {
      summary: data.summary,
      priorityOrder,
      teamRationale: (data.teamRationale ?? []).filter((r) => allowed.has(r.courseId)),
    };
  }
}

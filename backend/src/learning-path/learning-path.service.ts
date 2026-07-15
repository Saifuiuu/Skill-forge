import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { isAiFallback } from '../ai/interfaces/ai-completion.interface';
import { Course } from '../courses/entities/course.entity';
import { Enrolment, EnrolmentStatus } from '../enrolments/entities/enrolment.entity';
import { UsersService } from '../users/users.service';
import { RecommendLearningPathDto } from './dto/recommend-learning-path.dto';
import {
  LearningPathRecommendationDto,
  RecommendedCourseDto,
} from './dto/learning-path-response.dto';

interface AiLearningPathPayload {
  summary: string;
  totalEstimatedTime: string;
  courses: Array<{
    courseId: string;
    sequenceOrder: number;
    rationale: string;
  }>;
}

const LEARNING_PATH_SYSTEM_PROMPT = `You are SkillForge's corporate learning advisor.
Recommend a sequenced learning path using ONLY the course IDs provided in the catalogue.
Rules:
- Recommend every useful catalogue course up to a maximum of 8.
- If the catalogue has fewer than 5 courses, return ALL eligible catalogue courseIds (do not invent extras).
- Respect prerequisite chains: prerequisites must appear before dependent courses.
- Prefer courses not yet completed when they support the career goal.
- Include mandatory courses with upcoming deadlines when relevant.
- Use only courseId values from the provided catalogue.
Output JSON shape:
{
  "summary": "string",
  "totalEstimatedTime": "string e.g. 12 hours over 6 weeks",
  "courses": [
    { "courseId": "uuid", "sequenceOrder": 1, "rationale": "string" }
  ]
}`;

@Injectable()
export class LearningPathService {
  private readonly logger = new Logger(LearningPathService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly usersService: UsersService,
    @InjectRepository(Course)
    private readonly coursesRepo: Repository<Course>,
    @InjectRepository(Enrolment)
    private readonly enrolmentsRepo: Repository<Enrolment>,
  ) {}

  async recommend(
    userId: string,
    dto: RecommendLearningPathDto,
  ): Promise<LearningPathRecommendationDto> {
    const user = await this.usersService.findOne(userId);
    const enrolments = await this.enrolmentsRepo.find({
      where: { employee: { id: userId } },
      relations: { course: true },
      order: { updatedAt: 'DESC' },
    });

    const departmentId = user.team?.department?.id;
    const departmentName =
      dto.department ?? user.team?.department?.name ?? 'General';

    const role = dto.role ?? user.role;
    const completionHistory =
      dto.completionHistory ?? this.buildCompletionHistory(enrolments);

    const catalogue = await this.loadCatalogue(departmentId);
    const aiAttempt = await this.tryAiRecommendation({
      role,
      departmentName,
      careerGoal: dto.careerGoal,
      completionHistory,
      catalogue,
      enrolments,
    });

    if (aiAttempt.ok) {
      return aiAttempt.data;
    }

    return this.buildFallbackPath(catalogue, aiAttempt.reason);
  }

  private buildCompletionHistory(enrolments: Enrolment[]): string {
    if (!enrolments.length) {
      return 'No courses completed or in progress yet.';
    }

    return enrolments
      .map((enrolment) => {
        const status = enrolment.status.replace(/_/g, ' ').toLowerCase();
        return `${enrolment.course.title} (${status}, ${enrolment.progressPercentage}% progress)`;
      })
      .join('; ');
  }

  private async loadCatalogue(departmentId?: string): Promise<Course[]> {
    const qb = this.coursesRepo
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.prerequisites', 'prerequisites')
      .where('course.isLatestVersion = true');

    if (departmentId) {
      qb.andWhere(
        '(cardinality(course.departmentIds) = 0 OR :departmentId = ANY(course.departmentIds))',
        { departmentId },
      );
    }

    return qb.orderBy('course.isMandatory', 'DESC').addOrderBy('course.title', 'ASC').getMany();
  }

  private async tryAiRecommendation(context: {
    role: string;
    departmentName: string;
    careerGoal: string;
    completionHistory: string;
    catalogue: Course[];
    enrolments: Enrolment[];
  }): Promise<
    | { ok: true; data: LearningPathRecommendationDto }
    | { ok: false; reason: string }
  > {
    if (!context.catalogue.length) {
      return { ok: false, reason: 'No courses available in catalogue' };
    }

    const completedIds = new Set(
      context.enrolments
        .filter((e) => e.status === EnrolmentStatus.PASSED)
        .map((e) => e.course.id),
    );

    const catalogueJson = context.catalogue.map((course) => ({
      courseId: course.id,
      title: course.title,
      description: course.description,
      estimatedDuration: course.estimatedDuration,
      isMandatory: course.isMandatory,
      regulatoryDeadline: course.regulatoryDeadline,
      prerequisiteIds: course.prerequisites?.map((p) => p.id) ?? [],
      alreadyCompleted: completedIds.has(course.id),
    }));

    const userPrompt = `Employee context:
- Role: ${context.role}
- Department: ${context.departmentName}
- Career goal: ${context.careerGoal}
- Completion history: ${context.completionHistory}

Available course catalogue (use only these courseId values):
${JSON.stringify(catalogueJson, null, 2)}`;

    const { data, result } = await this.aiService.completeJson<AiLearningPathPayload>(
      LEARNING_PATH_SYSTEM_PROMPT,
      userPrompt,
      { maxTokens: 3000 },
    );

    if (isAiFallback(result)) {
      this.logger.warn(`Learning path AI fallback from AiService: ${result.reason}`);
      return { ok: false, reason: result.reason };
    }

    if (!data?.courses?.length) {
      this.logger.warn('Learning path AI returned empty courses array');
      return { ok: false, reason: 'AI returned no courses' };
    }

    const courseMap = new Map(context.catalogue.map((course) => [course.id, course]));
    const recommended = data.courses
      .filter((item) => courseMap.has(item.courseId))
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
      .slice(0, 8)
      .map((item) => this.toRecommendedCourse(item, courseMap.get(item.courseId)!));

    // Previously required min(5, catalogueSize), which discarded successful Groq
    // answers whenever the model returned fewer than 5 (common with small catalogues).
    if (!recommended.length) {
      this.logger.warn(
        `Learning path AI returned ${data.courses.length} courseId(s) but none matched the catalogue`,
      );
      return {
        ok: false,
        reason: 'AI courseIds did not match the available catalogue',
      };
    }

    this.logger.log(
      `Learning path AI accepted ${recommended.length}/${context.catalogue.length} catalogue courses`,
    );

    return {
      ok: true,
      data: {
        source: 'ai',
        courses: recommended,
        totalEstimatedTime:
          data.totalEstimatedTime || this.sumDurations(recommended),
        summary: data.summary || 'Personalised learning path based on your career goal.',
      },
    };
  }

  private buildFallbackPath(
    catalogue: Course[],
    reason: string,
  ): LearningPathRecommendationDto {
    const mandatory = catalogue
      .filter((course) => course.isMandatory)
      .sort((a, b) => {
        if (!a.regulatoryDeadline && !b.regulatoryDeadline) {
          return a.title.localeCompare(b.title);
        }
        if (!a.regulatoryDeadline) return 1;
        if (!b.regulatoryDeadline) return -1;
        return (
          new Date(a.regulatoryDeadline).getTime() -
          new Date(b.regulatoryDeadline).getTime()
        );
      });

    const pool = (mandatory.length ? mandatory : catalogue).slice(0, 8);
    const courses = pool.map((course, index) =>
      this.toRecommendedCourse(
        {
          courseId: course.id,
          sequenceOrder: index + 1,
          rationale: mandatory.length
            ? 'HR default sequence: mandatory training ordered by regulatory deadline urgency.'
            : 'HR default sequence: recommended core courses for your department.',
        },
        course,
      ),
    );

    return {
      source: 'fallback',
      courses,
      totalEstimatedTime: this.sumDurations(courses),
      summary:
        'Default HR learning path using mandatory courses sorted by upcoming regulatory deadlines.',
      fallbackReason: this.aiService.isDisabled()
        ? 'AI_DISABLED flag is set'
        : reason,
    };
  }

  private toRecommendedCourse(
    item: { courseId: string; sequenceOrder: number; rationale: string },
    course: Course,
  ): RecommendedCourseDto {
    return {
      courseId: item.courseId,
      title: course.title,
      sequenceOrder: item.sequenceOrder,
      rationale: item.rationale,
      estimatedDuration: course.estimatedDuration,
    };
  }

  private sumDurations(courses: RecommendedCourseDto[]): string {
    const hours = courses.reduce((total, course) => {
      const match = course.estimatedDuration.match(/(\d+(?:\.\d+)?)\s*hour/i);
      return total + (match ? Number(match[1]) : 0);
    }, 0);

    if (hours > 0) {
      return `${hours} hours total`;
    }

    return `${courses.length} courses`;
  }
}

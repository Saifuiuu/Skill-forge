import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LearningPathService } from './learning-path.service';
import { AiService } from '../ai/ai.service';
import { UsersService } from '../users/users.service';
import { Course } from '../courses/entities/course.entity';
import { Enrolment, EnrolmentStatus } from '../enrolments/entities/enrolment.entity';
import { UserRole } from '../users/entities/user.entity';

describe('LearningPathService', () => {
  let service: LearningPathService;

  const mockCourses: Course[] = [
    {
      id: 'course-1',
      title: 'AML Basics',
      description: 'Anti-money laundering fundamentals',
      estimatedDuration: '2 hours',
      isMandatory: true,
      regulatoryDeadline: new Date('2026-08-01'),
      departmentIds: [],
      contentType: null,
      contentUrl: null,
      version: 1,
      isLatestVersion: true,
      previousVersionId: null,
      prerequisites: [],
      createdBy: {} as any,
      enrolments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'course-2',
      title: 'Data Privacy',
      description: 'GDPR and privacy training',
      estimatedDuration: '3 hours',
      isMandatory: true,
      regulatoryDeadline: new Date('2026-06-01'),
      departmentIds: [],
      contentType: null,
      contentUrl: null,
      version: 1,
      isLatestVersion: true,
      previousVersionId: null,
      prerequisites: [],
      createdBy: {} as any,
      enrolments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'course-3',
      title: 'Leadership Essentials',
      description: 'Management skills',
      estimatedDuration: '4 hours',
      isMandatory: false,
      regulatoryDeadline: null as any,
      departmentIds: [],
      contentType: null,
      contentUrl: null,
      version: 1,
      isLatestVersion: true,
      previousVersionId: null,
      prerequisites: [],
      createdBy: {} as any,
      enrolments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'course-4',
      title: 'Risk Management',
      description: 'Enterprise risk',
      estimatedDuration: '2 hours',
      isMandatory: true,
      regulatoryDeadline: new Date('2026-09-01'),
      departmentIds: [],
      contentType: null,
      contentUrl: null,
      version: 1,
      isLatestVersion: true,
      previousVersionId: null,
      prerequisites: [],
      createdBy: {} as any,
      enrolments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'course-5',
      title: 'Ethics Training',
      description: 'Code of conduct',
      estimatedDuration: '1 hour',
      isMandatory: true,
      regulatoryDeadline: new Date('2026-07-01'),
      departmentIds: [],
      contentType: null,
      contentUrl: null,
      version: 1,
      isLatestVersion: true,
      previousVersionId: null,
      prerequisites: [],
      createdBy: {} as any,
      enrolments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockUser = {
    id: 'user-1',
    fullName: 'Jordan Ellis',
    email: 'employee@nexara.com',
    password: 'hash',
    role: UserRole.EMPLOYEE,
    refreshTokenHash: null,
    team: {
      id: 'team-1',
      name: 'Finance Team A',
      department: {
        id: 'dept-1',
        name: 'Finance & Accounting',
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const aiService = {
    isDisabled: jest.fn().mockReturnValue(true),
    completeJson: jest.fn(),
  };

  const usersService = {
    findOne: jest.fn().mockResolvedValue(mockUser),
  };

  const coursesRepo = {
    createQueryBuilder: jest.fn(),
  };

  const enrolmentsRepo = {
    find: jest.fn().mockResolvedValue([
      {
        status: EnrolmentStatus.PASSED,
        progressPercentage: 100,
        course: { id: 'course-1', title: 'AML Basics' },
      },
    ]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    aiService.completeJson.mockResolvedValue({
      data: null,
      result: { usedFallback: true, reason: 'AI_DISABLED flag is set' },
    });

    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(mockCourses),
    };
    coursesRepo.createQueryBuilder.mockReturnValue(qb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningPathService,
        { provide: AiService, useValue: aiService },
        { provide: UsersService, useValue: usersService },
        { provide: getRepositoryToken(Course), useValue: coursesRepo },
        { provide: getRepositoryToken(Enrolment), useValue: enrolmentsRepo },
      ],
    }).compile();

    service = module.get(LearningPathService);
  });

  it('returns fallback mandatory sequence sorted by deadline', async () => {
    const result = await service.recommend('user-1', {
      careerGoal: 'Become a compliance lead',
    });

    expect(result.source).toBe('fallback');
    expect(result.courses).toHaveLength(4);
    expect(result.courses[0].courseId).toBe('course-2');
    expect(result.courses[0].title).toBe('Data Privacy');
    expect(result.fallbackReason).toContain('AI');
  });

  it('returns AI recommendation when model responds with valid JSON', async () => {
    aiService.isDisabled.mockReturnValue(false);
    aiService.completeJson.mockResolvedValue({
      data: {
        summary: 'Path to compliance leadership',
        totalEstimatedTime: '12 hours over 6 weeks',
        courses: [
          { courseId: 'course-2', sequenceOrder: 1, rationale: 'Urgent deadline' },
          { courseId: 'course-5', sequenceOrder: 2, rationale: 'Ethics foundation' },
          { courseId: 'course-1', sequenceOrder: 3, rationale: 'Already completed but reinforces AML' },
          { courseId: 'course-4', sequenceOrder: 4, rationale: 'Risk depth' },
          { courseId: 'course-3', sequenceOrder: 5, rationale: 'Leadership for promotion' },
        ],
      },
      result: { usedFallback: false, text: '{}', model: 'claude' },
    });

    const result = await service.recommend('user-1', {
      careerGoal: 'Become a compliance lead',
    });

    expect(result.source).toBe('ai');
    expect(result.courses).toHaveLength(5);
    expect(result.summary).toContain('compliance');
  });
});

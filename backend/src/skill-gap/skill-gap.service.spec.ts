import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { SkillGapService } from './skill-gap.service';
import { AiService } from '../ai/ai.service';
import { Team } from '../teams/entities/team.entity';
import { Course } from '../courses/entities/course.entity';
import { Enrolment, EnrolmentStatus } from '../enrolments/entities/enrolment.entity';
import { User, UserRole } from '../users/entities/user.entity';

describe('SkillGapService', () => {
  let service: SkillGapService;

  const courses: Course[] = [
    {
      id: 'course-urgent',
      title: 'Data Privacy',
      description: 'Privacy basics',
      estimatedDuration: '2 hours',
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
      id: 'course-later',
      title: 'AML Basics',
      description: 'AML',
      estimatedDuration: '3 hours',
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
  ];

  const employee: User = {
    id: 'emp-1',
    fullName: 'Jordan Ellis',
    email: 'employee@nexara.com',
    password: 'hash',
    role: UserRole.EMPLOYEE,
    refreshTokenHash: null,
    team: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const manager: User = {
    id: 'mgr-1',
    fullName: 'Samira Khan',
    email: 'manager@nexara.com',
    password: 'hash',
    role: UserRole.MANAGER,
    refreshTokenHash: null,
    team: { id: 'team-1' } as Team,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const team: Team = {
    id: 'team-1',
    name: 'Finance Team A',
    department: { id: 'dept-1', name: 'Finance' } as any,
    members: [manager, employee],
    createdAt: new Date(),
  };

  const aiService = {
    isDisabled: jest.fn().mockReturnValue(true),
    completeJson: jest.fn(),
  };

  const teamsRepo = {
    findOne: jest.fn().mockResolvedValue(team),
  };

  const coursesRepo = {
    find: jest.fn().mockResolvedValue(courses),
  };

  const enrolmentsRepo = {
    find: jest.fn().mockResolvedValue([
      {
        status: EnrolmentStatus.PASSED,
        progressPercentage: 100,
        employee: { id: employee.id },
        course: { id: 'course-later' },
      },
      {
        status: EnrolmentStatus.IN_PROGRESS,
        progressPercentage: 40,
        employee: { id: employee.id },
        course: { id: 'course-urgent' },
      },
    ]),
  };

  const usersRepo = {
    findOne: jest.fn().mockResolvedValue(manager),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    aiService.completeJson.mockResolvedValue({
      data: null,
      result: { usedFallback: true, reason: 'AI_DISABLED' },
    });
    teamsRepo.findOne.mockResolvedValue(team);
    coursesRepo.find.mockResolvedValue(courses);
    usersRepo.findOne.mockResolvedValue(manager);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillGapService,
        { provide: AiService, useValue: aiService },
        { provide: getRepositoryToken(Team), useValue: teamsRepo },
        { provide: getRepositoryToken(Course), useValue: coursesRepo },
        { provide: getRepositoryToken(Enrolment), useValue: enrolmentsRepo },
        { provide: getRepositoryToken(User), useValue: usersRepo },
      ],
    }).compile();

    service = module.get(SkillGapService);
  });

  it('returns fallback analysis ordered by deadline urgency', async () => {
    const result = await service.analyze('mgr-1', UserRole.MANAGER, {
      teamId: 'team-1',
      requiredCourseIds: ['course-later', 'course-urgent'],
      frameworkName: 'Compliance track',
    });

    expect(result.source).toBe('fallback');
    expect(result.priorityOrder[0]).toBe('course-urgent');
    expect(result.teamSummary[0].courseTitle).toBe('Data Privacy');
    expect(result.teamSummary[0].teamCoverage).toBe('PARTIALLY_COVERED');
    expect(result.individualBreakdown[0].coveredCount).toBe(1);
    expect(result.individualBreakdown[0].partiallyCoveredCount).toBe(1);
    expect(result.fallbackReason).toContain('AI_DISABLED');
  });

  it('returns AI source when enhancement succeeds', async () => {
    aiService.isDisabled.mockReturnValue(false);
    aiService.completeJson.mockResolvedValue({
      data: {
        summary: 'Prioritise privacy risk immediately',
        priorityOrder: ['course-urgent', 'course-later'],
        teamRationale: [
          { courseId: 'course-urgent', rationale: 'Nearest deadline and incomplete' },
        ],
      },
      result: { usedFallback: false, text: '{}', model: 'claude' },
    });

    const result = await service.analyze('mgr-1', UserRole.MANAGER, {
      teamId: 'team-1',
      requiredCourseIds: ['course-urgent', 'course-later'],
    });

    expect(result.source).toBe('ai');
    expect(result.summary).toContain('privacy');
    expect(result.teamSummary[0].aiRationale).toContain('Nearest deadline');
  });

  it('forbids managers analysing another team', async () => {
    usersRepo.findOne.mockResolvedValue({
      ...manager,
      team: { id: 'other-team' },
    });

    await expect(
      service.analyze('mgr-1', UserRole.MANAGER, {
        teamId: 'team-1',
        requiredCourseIds: ['course-urgent'],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

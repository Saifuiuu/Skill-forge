import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ComplianceAlerterService } from './compliance-alerter.service';
import { AiService } from '../ai/ai.service';
import { User, UserRole } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Enrolment, EnrolmentStatus } from '../enrolments/entities/enrolment.entity';

describe('ComplianceAlerterService', () => {
  let service: ComplianceAlerterService;

  const employee: User = {
    id: 'emp-1',
    fullName: 'Jordan Ellis',
    email: 'employee@nexara.com',
    password: 'hash',
    role: UserRole.EMPLOYEE,
    refreshTokenHash: null,
    team: {
      id: 'team-1',
      name: 'Finance Team A',
      department: { id: 'dept-1', name: 'Finance' },
    } as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const course: Course = {
    id: 'course-1',
    title: 'AML Basics',
    description: 'AML',
    estimatedDuration: '2 hours',
    isMandatory: true,
    regulatoryDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    departmentIds: ['dept-1'],
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
  };

  const aiService = {
    isDisabled: jest.fn().mockReturnValue(true),
    completeJson: jest.fn(),
  };

  const usersRepo = {
    find: jest.fn().mockResolvedValue([employee]),
  };

  const coursesRepo = {
    createQueryBuilder: jest.fn(),
  };

  const enrolmentsRepo = {
    find: jest.fn().mockResolvedValue([
      {
        status: EnrolmentStatus.IN_PROGRESS,
        progressPercentage: 30,
        employee: { id: employee.id },
        course: { id: course.id },
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
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([course]),
    };
    coursesRepo.createQueryBuilder.mockReturnValue(qb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceAlerterService,
        { provide: AiService, useValue: aiService },
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(Course), useValue: coursesRepo },
        { provide: getRepositoryToken(Enrolment), useValue: enrolmentsRepo },
      ],
    }).compile();

    service = module.get(ComplianceAlerterService);
  });

  it('generates fallback reminder drafts for incomplete mandatory courses', async () => {
    const batch = await service.runManually();

    expect(batch.trigger).toBe('manual');
    expect(batch.source).toBe('fallback');
    expect(batch.drafts).toHaveLength(1);
    expect(batch.drafts[0].employeeEmail).toBe('employee@nexara.com');
    expect(batch.drafts[0].subject).toContain('mandatory');
    expect(batch.drafts[0].coursesAtRisk[0].courseTitle).toBe('AML Basics');
    expect(batch.drafts[0].status).toBe('DRAFT');
  });

  it('mock-sends drafts and marks them SENT', async () => {
    const batch = await service.runManually();
    const sent = await service.sendBatch(batch.id);

    expect(sent.drafts[0].status).toBe('SENT');
    expect(sent.sentAt).toBeDefined();
  });

  it('lists generated batches', async () => {
    await service.runManually();
    const list = service.listBatches();
    expect(list.length).toBeGreaterThanOrEqual(1);
  });
});

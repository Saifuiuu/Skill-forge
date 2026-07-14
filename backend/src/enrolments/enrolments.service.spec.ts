import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EnrolmentsService } from './enrolments.service';
import { Enrolment } from './entities/enrolment.entity';
import { CoursesService } from '../courses/courses.service';
import { EnrolmentsGateway } from './enrolments.gateway';

describe('EnrolmentsService', () => {
  let service: EnrolmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrolmentsService,
        {
          provide: getRepositoryToken(Enrolment),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: CoursesService,
          useValue: { arePrerequisitesMet: jest.fn().mockResolvedValue(true) },
        },
        {
          provide: EnrolmentsGateway,
          useValue: { notifyManagerOfCompletion: jest.fn() },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(EnrolmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

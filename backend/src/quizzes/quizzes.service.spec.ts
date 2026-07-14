import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuizzesService } from './quizzes.service';
import { Quiz } from './entities/quiz.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { Enrolment } from '../enrolments/entities/enrolment.entity';
import { EnrolmentsService } from '../enrolments/enrolments.service';

describe('QuizzesService', () => {
  let service: QuizzesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizzesService,
        { provide: getRepositoryToken(Quiz), useValue: { create: jest.fn(), save: jest.fn(), find: jest.fn(), findOne: jest.fn(), remove: jest.fn() } },
        { provide: getRepositoryToken(QuizAttempt), useValue: { create: jest.fn(), save: jest.fn(), count: jest.fn(), findOne: jest.fn() } },
        { provide: getRepositoryToken(Enrolment), useValue: { findOne: jest.fn(), save: jest.fn() } },
        {
          provide: EnrolmentsService,
          useValue: { markPassed: jest.fn(), markFailed: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(QuizzesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

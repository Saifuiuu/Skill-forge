import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { QuizGeneratorService } from './quiz-generator.service';
import { AiService } from '../ai/ai.service';
import { PdfExtractionService } from './pdf-extraction.service';
import { Course, ContentType } from '../courses/entities/course.entity';
import { Quiz } from '../quizzes/entities/quiz.entity';
import { Question, QuestionType } from '../questions/entities/question.entity';

describe('QuizGeneratorService', () => {
  let service: QuizGeneratorService;

  const course: Course = {
    id: 'course-1',
    title: 'AML Basics',
    description: 'Anti-money laundering training',
    estimatedDuration: '2 hours',
    isMandatory: true,
    regulatoryDeadline: null as any,
    departmentIds: [],
    contentType: ContentType.PDF,
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

  const pdfExtractionService = {
    extractText: jest.fn().mockResolvedValue('Sample AML training content about compliance.'),
  };

  const coursesRepo = {
    findOne: jest.fn().mockResolvedValue(course),
  };

  const quizzesRepo = {
    findOne: jest.fn(),
    create: jest.fn((data) => ({ id: 'quiz-1', questions: [], ...data })),
    save: jest.fn((quiz) => Promise.resolve({ id: 'quiz-1', ...quiz })),
  };

  const questionsRepo = {
    delete: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn((questions) => Promise.resolve(questions)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    coursesRepo.findOne.mockResolvedValue(course);
    aiService.completeJson.mockResolvedValue({ data: null, result: { usedFallback: true, reason: 'AI_DISABLED' } });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizGeneratorService,
        { provide: AiService, useValue: aiService },
        { provide: PdfExtractionService, useValue: pdfExtractionService },
        { provide: getRepositoryToken(Course), useValue: coursesRepo },
        { provide: getRepositoryToken(Quiz), useValue: quizzesRepo },
        { provide: getRepositoryToken(Question), useValue: questionsRepo },
      ],
    }).compile();

    service = module.get(QuizGeneratorService);
  });

  it('returns fallback blank template when AI is disabled', async () => {
    const result = await service.generateFromPdf('course-1', Buffer.from('%PDF-1.4'));

    expect(result.source).toBe('fallback');
    expect(result.questions).toHaveLength(5);
    expect(result.questions.filter((q) => q.type === QuestionType.MCQ)).toHaveLength(3);
    expect(result.fallbackReason).toContain('AI_DISABLED');
  });

  it('returns AI-generated draft questions when model responds', async () => {
    aiService.isDisabled.mockReturnValue(false);
    aiService.completeJson.mockResolvedValue({
      data: {
        questions: [
          {
            type: 'MCQ',
            text: 'What is AML?',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'B',
            explanation: 'AML means anti-money laundering.',
          },
          {
            type: 'MCQ',
            text: 'Who must report suspicious activity?',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'C',
            explanation: 'Employees must report.',
          },
          {
            type: 'MCQ',
            text: 'What is a red flag?',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'A',
            explanation: 'Unusual transactions.',
          },
          {
            type: 'SHORT_ANSWER',
            text: 'Define KYC.',
            correctAnswer: 'Know Your Customer',
            explanation: 'Identity verification process.',
          },
        ],
      },
      result: { usedFallback: false, text: '{}', model: 'claude' },
    });

    const result = await service.generateFromPdf('course-1', Buffer.from('%PDF-1.4'));

    expect(result.source).toBe('ai');
    expect(result.questions).toHaveLength(4);
    expect(result.questions[0].options).toHaveLength(4);
  });

  it('publishes reviewed questions to quiz', async () => {
    quizzesRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'quiz-1',
      course,
      questions: [],
      passThreshold: 75,
      maxAttempts: 3,
      timeLimitMinutes: 30,
    });

    const published = await service.publish('course-1', {
      questions: [
        {
          type: QuestionType.MCQ,
          text: 'What is AML?',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'B',
          explanation: 'Definition',
        },
      ],
    });

    expect(questionsRepo.delete).toHaveBeenCalled();
    expect(questionsRepo.save).toHaveBeenCalled();
    expect(published.id).toBe('quiz-1');
  });

  it('rejects invalid MCQ publish payload', async () => {
    await expect(
      service.publish('course-1', {
        questions: [
          {
            type: QuestionType.MCQ,
            text: 'Bad question',
            options: ['A', 'B'],
            correctAnswer: 'B',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { QuizGeneratorController } from './quiz-generator.controller';
import { QuizGeneratorService } from './quiz-generator.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { UserRole } from '../users/entities/user.entity';
import { QuestionType } from '../questions/entities/question.entity';

describe('QuizGeneratorController', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const quizGeneratorService = {
    generateFromPdf: jest.fn().mockResolvedValue({
      source: 'fallback',
      courseId: 'course-1',
      courseTitle: 'AML Basics',
      extractedTextPreview: 'preview',
      questions: [],
    }),
    generateTemplate: jest.fn().mockResolvedValue({
      source: 'fallback',
      courseId: 'course-1',
      courseTitle: 'AML Basics',
      extractedTextPreview: '',
      questions: [],
    }),
    publish: jest.fn().mockResolvedValue({ id: 'quiz-1', questions: [] }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ JWT_SECRET: 'test-access-secret' })],
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
      ],
      controllers: [QuizGeneratorController],
      providers: [
        { provide: QuizGeneratorService, useValue: quizGeneratorService },
        JwtStrategy,
        JwtService,
        Reflector,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const reflector = app.get(Reflector);
    app.useGlobalGuards(new JwtAuthGuard(reflector), new RolesGuard(reflector));

    jwtService = app.get(JwtService);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const tokenFor = (role: UserRole) =>
    jwtService.sign(
      { sub: 'user-1', email: 'test@nexara.com', role },
      { secret: 'test-access-secret' },
    );

  it('returns 401 without auth token for template', async () => {
    await request(app.getHttpServer())
      .get('/quiz-generator/course-1/template')
      .expect(401);
  });

  it('returns 403 for employee on template endpoint', async () => {
    await request(app.getHttpServer())
      .get('/quiz-generator/course-1/template')
      .set('Authorization', `Bearer ${tokenFor(UserRole.EMPLOYEE)}`)
      .expect(403);
  });

  it('returns 200 for content admin template endpoint', async () => {
    const res = await request(app.getHttpServer())
      .get('/quiz-generator/course-1/template')
      .set('Authorization', `Bearer ${tokenFor(UserRole.CONTENT_ADMIN)}`)
      .expect(200);

    expect(res.body.source).toBe('fallback');
  });

  it('returns 400 when publish payload is invalid', async () => {
    await request(app.getHttpServer())
      .post('/quiz-generator/course-1/publish')
      .set('Authorization', `Bearer ${tokenFor(UserRole.CONTENT_ADMIN)}`)
      .send({ questions: [] })
      .expect(400);
  });

  it('returns 201 when content admin publishes questions', async () => {
    await request(app.getHttpServer())
      .post('/quiz-generator/course-1/publish')
      .set('Authorization', `Bearer ${tokenFor(UserRole.CONTENT_ADMIN)}`)
      .send({
        questions: [
          {
            type: QuestionType.MCQ,
            text: 'What is AML?',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'B',
            explanation: 'Definition',
          },
        ],
      })
      .expect(201);
  });
});

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { QuizzesController } from './quizzes.controller';
import { QuizzesService } from './quizzes.service';
import { authHeader, createControllerApp } from '../test-utils/controller-test.helper';
import { UserRole } from '../users/entities/user.entity';

describe('QuizzesController', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const quizzesService = {
    create: jest.fn().mockResolvedValue({ id: 'q1' }),
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: 'q1', questions: [] }),
    update: jest.fn().mockResolvedValue({ id: 'q1' }),
    remove: jest.fn().mockResolvedValue(undefined),
    startAttempt: jest.fn().mockResolvedValue({ attemptId: 'a1', questions: [] }),
    submitAttempt: jest.fn().mockResolvedValue({ score: 80, passed: true }),
    grantOverride: jest.fn().mockResolvedValue({ bonusAttempts: 1 }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    ({ app, jwtService } = await createControllerApp({
      controllers: [QuizzesController],
      providers: [{ provide: QuizzesService, useValue: quizzesService }],
    }));
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /quizzes returns 401 without token', async () => {
    await request(app.getHttpServer()).get('/quizzes').expect(401);
  });

  it('GET /quizzes returns 200 for employee', async () => {
    await request(app.getHttpServer())
      .get('/quizzes')
      .set(authHeader(jwtService, UserRole.EMPLOYEE))
      .expect(200);
  });

  it('POST /quizzes returns 403 for employee', async () => {
    await request(app.getHttpServer())
      .post('/quizzes')
      .set(authHeader(jwtService, UserRole.EMPLOYEE))
      .send({ courseId: '11111111-1111-4111-8111-111111111111' })
      .expect(403);
  });

  it('POST /quizzes returns 201 for content admin', async () => {
    await request(app.getHttpServer())
      .post('/quizzes')
      .set(authHeader(jwtService, UserRole.CONTENT_ADMIN))
      .send({ courseId: '11111111-1111-4111-8111-111111111111' })
      .expect(201);
  });

  it('POST /quizzes/:id/override returns 403 for employee', async () => {
    await request(app.getHttpServer())
      .post('/quizzes/11111111-1111-4111-8111-111111111111/override')
      .set(authHeader(jwtService, UserRole.EMPLOYEE))
      .send({ employeeId: '22222222-2222-4222-8222-222222222222' })
      .expect(403);
  });

  it('POST /quizzes/:id/override returns 201 for manager', async () => {
    await request(app.getHttpServer())
      .post('/quizzes/11111111-1111-4111-8111-111111111111/override')
      .set(authHeader(jwtService, UserRole.MANAGER))
      .send({ employeeId: '22222222-2222-4222-8222-222222222222' })
      .expect(201);
  });
});

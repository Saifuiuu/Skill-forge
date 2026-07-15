import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { authHeader, createControllerApp } from '../test-utils/controller-test.helper';
import { UserRole } from '../users/entities/user.entity';

describe('QuestionsController', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const questionsService = {
    create: jest.fn().mockReturnValue('created'),
    findAll: jest.fn().mockReturnValue([]),
    findOne: jest.fn().mockReturnValue({ id: 1 }),
    update: jest.fn().mockReturnValue({ id: 1 }),
    remove: jest.fn().mockReturnValue(undefined),
  };

  beforeEach(async () => {
    ({ app, jwtService } = await createControllerApp({
      controllers: [QuestionsController],
      providers: [{ provide: QuestionsService, useValue: questionsService }],
    }));
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /questions returns 401 without token', async () => {
    await request(app.getHttpServer()).get('/questions').expect(401);
  });

  it('GET /questions returns 200 with token', async () => {
    await request(app.getHttpServer())
      .get('/questions')
      .set(authHeader(jwtService, UserRole.CONTENT_ADMIN))
      .expect(200);
  });
});

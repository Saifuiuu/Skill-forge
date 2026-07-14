import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { authHeader, createControllerApp } from '../test-utils/controller-test.helper';
import { UserRole } from '../users/entities/user.entity';

describe('CoursesController', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const coursesService = {
    create: jest.fn().mockResolvedValue({ id: 'c1', title: 'AML' }),
    findAll: jest.fn().mockResolvedValue([{ id: 'c1', title: 'AML' }]),
    findOne: jest.fn().mockResolvedValue({ id: 'c1', title: 'AML' }),
    update: jest.fn().mockResolvedValue({ id: 'c1', title: 'AML Updated' }),
    remove: jest.fn().mockResolvedValue(undefined),
    createNewVersion: jest.fn().mockResolvedValue({ id: 'c2', version: 2 }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    ({ app, jwtService } = await createControllerApp({
      controllers: [CoursesController],
      providers: [{ provide: CoursesService, useValue: coursesService }],
    }));
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /courses returns 401 without token', async () => {
    await request(app.getHttpServer()).get('/courses').expect(401);
  });

  it('GET /courses returns 200 for employee', async () => {
    const res = await request(app.getHttpServer())
      .get('/courses')
      .set(authHeader(jwtService, UserRole.EMPLOYEE))
      .expect(200);
    expect(res.body).toHaveLength(1);
  });

  it('POST /courses returns 403 for employee', async () => {
    await request(app.getHttpServer())
      .post('/courses')
      .set(authHeader(jwtService, UserRole.EMPLOYEE))
      .send({
        title: 'AML',
        description: 'Basics',
        estimatedDuration: '2 hours',
      })
      .expect(403);
  });

  it('POST /courses returns 201 for content admin', async () => {
    await request(app.getHttpServer())
      .post('/courses')
      .set(authHeader(jwtService, UserRole.CONTENT_ADMIN))
      .send({
        title: 'AML',
        description: 'Basics',
        estimatedDuration: '2 hours',
      })
      .expect(201);
  });

  it('DELETE /courses/:id returns 403 for manager', async () => {
    await request(app.getHttpServer())
      .delete('/courses/11111111-1111-4111-8111-111111111111')
      .set(authHeader(jwtService, UserRole.MANAGER))
      .expect(403);
  });
});

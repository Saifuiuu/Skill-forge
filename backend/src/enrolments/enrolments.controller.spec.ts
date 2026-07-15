import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { EnrolmentsController } from './enrolments.controller';
import { EnrolmentsService } from './enrolments.service';
import { authHeader, createControllerApp } from '../test-utils/controller-test.helper';
import { UserRole } from '../users/entities/user.entity';

describe('EnrolmentsController', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const enrolmentsService = {
    selfEnrol: jest.fn().mockResolvedValue({ id: 'e1' }),
    bulkEnrol: jest.fn().mockResolvedValue([{ id: 'e1' }]),
    findMyEnrolments: jest.fn().mockResolvedValue([]),
    updateProgress: jest.fn().mockResolvedValue({ id: 'e1', progressPercentage: 50 }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    ({ app, jwtService } = await createControllerApp({
      controllers: [EnrolmentsController],
      providers: [{ provide: EnrolmentsService, useValue: enrolmentsService }],
    }));
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /enrolments/mine returns 401 without token', async () => {
    await request(app.getHttpServer()).get('/enrolments/mine').expect(401);
  });

  it('GET /enrolments/mine returns 200 for employee', async () => {
    await request(app.getHttpServer())
      .get('/enrolments/mine')
      .set(authHeader(jwtService, UserRole.EMPLOYEE))
      .expect(200);
  });

  it('POST /enrolments/bulk returns 403 for employee', async () => {
    await request(app.getHttpServer())
      .post('/enrolments/bulk')
      .set(authHeader(jwtService, UserRole.EMPLOYEE))
      .send({
        courseId: '11111111-1111-4111-8111-111111111111',
        employeeIds: ['22222222-2222-4222-8222-222222222222'],
      })
      .expect(403);
  });

  it('POST /enrolments/bulk returns 201 for manager', async () => {
    await request(app.getHttpServer())
      .post('/enrolments/bulk')
      .set(authHeader(jwtService, UserRole.MANAGER))
      .send({
        courseId: '11111111-1111-4111-8111-111111111111',
        employeeIds: ['22222222-2222-4222-8222-222222222222'],
      })
      .expect(201);
  });

  it('POST /enrolments/self returns 201 for employee', async () => {
    await request(app.getHttpServer())
      .post('/enrolments/self')
      .set(authHeader(jwtService, UserRole.EMPLOYEE))
      .send({ courseId: '11111111-1111-4111-8111-111111111111' })
      .expect(201);
  });
});

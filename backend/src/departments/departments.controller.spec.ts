import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { authHeader, createControllerApp } from '../test-utils/controller-test.helper';
import { UserRole } from '../users/entities/user.entity';

describe('DepartmentsController', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const departmentsService = {
    create: jest.fn().mockResolvedValue({ id: 1, name: 'Finance' }),
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: 1 }),
    update: jest.fn().mockResolvedValue({ id: 1 }),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    ({ app, jwtService } = await createControllerApp({
      controllers: [DepartmentsController],
      providers: [{ provide: DepartmentsService, useValue: departmentsService }],
    }));
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /departments returns 401 without token', async () => {
    await request(app.getHttpServer()).get('/departments').expect(401);
  });

  it('GET /departments returns 200 with token', async () => {
    await request(app.getHttpServer())
      .get('/departments')
      .set(authHeader(jwtService, UserRole.MANAGER))
      .expect(200);
  });
});

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { authHeader, createControllerApp } from '../test-utils/controller-test.helper';
import { UserRole } from '../users/entities/user.entity';

describe('CompaniesController', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const companiesService = {
    create: jest.fn().mockResolvedValue({ id: 1, name: 'Nexara' }),
    findAll: jest.fn().mockResolvedValue([{ id: 1, name: 'Nexara' }]),
    findOne: jest.fn().mockResolvedValue({ id: 1, name: 'Nexara' }),
    update: jest.fn().mockResolvedValue({ id: 1, name: 'Nexara Group' }),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    ({ app, jwtService } = await createControllerApp({
      controllers: [CompaniesController],
      providers: [{ provide: CompaniesService, useValue: companiesService }],
    }));
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /companies returns 401 without token', async () => {
    await request(app.getHttpServer()).get('/companies').expect(401);
  });

  it('GET /companies returns 200 with token', async () => {
    await request(app.getHttpServer())
      .get('/companies')
      .set(authHeader(jwtService, UserRole.HR_ADMIN))
      .expect(200);
  });

  it('POST /companies returns 201 with token', async () => {
    await request(app.getHttpServer())
      .post('/companies')
      .set(authHeader(jwtService, UserRole.HR_ADMIN))
      .send({})
      .expect(201);
  });
});

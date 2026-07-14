import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { authHeader, createControllerApp } from '../test-utils/controller-test.helper';
import { UserRole } from './entities/user.entity';

describe('UsersController', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const usersService = {
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'u@nexara.com',
      fullName: 'U',
      role: UserRole.EMPLOYEE,
    }),
    create: jest.fn().mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'u@nexara.com',
    }),
    update: jest.fn().mockResolvedValue({ id: '11111111-1111-4111-8111-111111111111' }),
    remove: jest.fn().mockResolvedValue(undefined),
    sanitizeUser: jest.fn((u) => u),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    ({ app, jwtService } = await createControllerApp({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }));
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /users returns 401 without token', async () => {
    await request(app.getHttpServer()).get('/users').expect(401);
  });

  it('GET /users returns 403 for EMPLOYEE', async () => {
    await request(app.getHttpServer())
      .get('/users')
      .set(authHeader(jwtService, UserRole.EMPLOYEE))
      .expect(403);
  });

  it('GET /users returns 200 for MANAGER', async () => {
    await request(app.getHttpServer())
      .get('/users')
      .set(authHeader(jwtService, UserRole.MANAGER))
      .expect(200);
  });

  it('GET /users returns 200 for HR_ADMIN', async () => {
    await request(app.getHttpServer())
      .get('/users')
      .set(authHeader(jwtService, UserRole.HR_ADMIN))
      .expect(200);
  });

  it('POST /users returns 403 for MANAGER', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .set(authHeader(jwtService, UserRole.MANAGER))
      .send({
        fullName: 'X',
        email: 'x@nexara.com',
        password: 'DemoPass123!',
        role: UserRole.EMPLOYEE,
      })
      .expect(403);
  });
});

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import {
  authHeader,
  createControllerApp,
  tokenFor,
} from '../test-utils/controller-test.helper';
import { UserRole } from '../users/entities/user.entity';

describe('AuthController', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const authService = {
    register: jest.fn().mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
      user: { email: 'new@nexara.com' },
    }),
    login: jest.fn().mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
      user: { email: 'test@nexara.com' },
    }),
    refresh: jest.fn().mockResolvedValue({ accessToken: 'a2', refreshToken: 'r2' }),
    logout: jest.fn().mockResolvedValue({ message: 'Logged out successfully' }),
  };

  const usersService = {
    findOne: jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'test@nexara.com',
      fullName: 'Test',
      role: UserRole.EMPLOYEE,
      password: 'hash',
      refreshTokenHash: null,
    }),
    sanitizeUser: jest.fn((u) => {
      const { password, refreshTokenHash, ...safe } = u;
      return safe;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    ({ app, jwtService } = await createControllerApp({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: usersService },
      ],
    }));
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /auth/login returns 200 (public)', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@nexara.com', password: 'DemoPass123!' })
      .expect(200);
  });

  it('POST /auth/register returns 201 (public)', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        fullName: 'New User',
        email: 'new@nexara.com',
        password: 'DemoPass123!',
      })
      .expect(201);
  });

  it('GET /auth/profile returns 401 without token', async () => {
    await request(app.getHttpServer()).get('/auth/profile').expect(401);
  });

  it('GET /auth/profile returns 200 with token', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/profile')
      .set(authHeader(jwtService, UserRole.EMPLOYEE))
      .expect(200);
    expect(res.body.email).toBe('test@nexara.com');
  });

  it('POST /auth/logout returns 401 without token', async () => {
    await request(app.getHttpServer()).post('/auth/logout').expect(401);
  });

  it('POST /auth/logout returns 200 with token', async () => {
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set(authHeader(jwtService, UserRole.EMPLOYEE))
      .expect(200);
  });
});

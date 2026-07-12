import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthModule } from '../src/auth/auth.module';
import { UsersModule } from '../src/users/users.module';
import { User, UserRole } from '../src/users/entities/user.entity';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';

describe('Auth & Role Guards (e2e)', () => {
  let app: INestApplication<App>;

  const mockUser: User = {
    id: 'user-uuid-1',
    fullName: 'Test Employee',
    email: 'test@nexara.com',
    password: 'hashed',
    role: UserRole.EMPLOYEE,
    refreshTokenHash: null,
    team: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const usersRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((data) => ({ ...mockUser, ...data })),
    save: jest.fn((user) => Promise.resolve(user)),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: 'test-access-secret',
              JWT_REFRESH_SECRET: 'test-refresh-secret',
              JWT_ACCESS_EXPIRES: '15m',
              JWT_REFRESH_EXPIRES: '7d',
            }),
          ],
        }),
        AuthModule,
        UsersModule,
      ],
    })
      .overrideProvider(getRepositoryToken(User))
      .useValue(usersRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    const reflector = app.get(Reflector);
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalGuards(new JwtAuthGuard(reflector), new RolesGuard(reflector));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    usersRepository.findOne.mockImplementation(({ where }: { where: { email?: string; id?: string } }) => {
      if (where.email === 'test@nexara.com') {
        return Promise.resolve({ ...mockUser, password: '$2b$10$hashedpassword' });
      }
      if (where.email === 'new@nexara.com') {
        return Promise.resolve(null);
      }
      if (where.id === mockUser.id) {
        return Promise.resolve(mockUser);
      }
      return Promise.resolve(null);
    });
  });

  describe('POST /auth/login', () => {
    it('returns 401 for invalid credentials', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@nexara.com', password: 'wrong' })
        .expect(401);
    });

    it('returns 200 and tokens for valid credentials', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-refresh' as never);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@nexara.com', password: 'DemoPass123!' })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe('test@nexara.com');
    });
  });

  describe('GET /auth/profile', () => {
    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get('/auth/profile').expect(401);
    });

    it('returns 200 with valid token', async () => {
      const jwtService = app.get(JwtService);
      const token = jwtService.sign(
        { sub: mockUser.id, email: mockUser.email, role: mockUser.role },
        { secret: 'test-access-secret' },
      );

      const res = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.email).toBe('test@nexara.com');
    });
  });

  describe('GET /users (role guard)', () => {
    it('returns 403 for EMPLOYEE role', async () => {
      const jwtService = app.get(JwtService);
      const token = jwtService.sign(
        { sub: mockUser.id, email: mockUser.email, role: UserRole.EMPLOYEE },
        { secret: 'test-access-secret' },
      );

      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('returns 200 for HR_ADMIN role', async () => {
      usersRepository.find.mockResolvedValueOnce([]);
      const jwtService = app.get(JwtService);
      const token = jwtService.sign(
        { sub: mockUser.id, email: mockUser.email, role: UserRole.HR_ADMIN },
        { secret: 'test-access-secret' },
      );

      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('POST /auth/register', () => {
    it('returns 201 for new user', async () => {
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          fullName: 'New User',
          email: 'new@nexara.com',
          password: 'DemoPass123!',
        })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe('new@nexara.com');
    });
  });
});

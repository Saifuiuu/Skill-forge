import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { LearningPathController } from './learning-path.controller';
import { LearningPathService } from './learning-path.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { UserRole } from '../users/entities/user.entity';

describe('LearningPathController', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const learningPathService = {
    recommend: jest.fn().mockResolvedValue({
      source: 'fallback',
      courses: [],
      totalEstimatedTime: '0 hours',
      summary: 'Default path',
    }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: 'test-access-secret',
            }),
          ],
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
      ],
      controllers: [LearningPathController],
      providers: [
        { provide: LearningPathService, useValue: learningPathService },
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

  it('returns 401 without auth token', async () => {
    await request(app.getHttpServer())
      .post('/learning-path/recommend')
      .send({ careerGoal: 'Grow into management' })
      .expect(401);
  });

  it('returns 201 for employee', async () => {
    const token = tokenFor(UserRole.EMPLOYEE);

    const res = await request(app.getHttpServer())
      .post('/learning-path/recommend')
      .set('Authorization', `Bearer ${token}`)
      .send({ careerGoal: 'Grow into management' })
      .expect(201);

    expect(res.body.source).toBe('fallback');
    expect(learningPathService.recommend).toHaveBeenCalled();
  });

  it('returns 403 for invalid role', async () => {
    const token = jwtService.sign(
      { sub: 'user-1', email: 'test@nexara.com', role: 'INVALID' },
      { secret: 'test-access-secret' },
    );

    await request(app.getHttpServer())
      .post('/learning-path/recommend')
      .set('Authorization', `Bearer ${token}`)
      .send({ careerGoal: 'Grow into management' })
      .expect(403);
  });

  it('returns 400 when careerGoal is missing', async () => {
    const token = tokenFor(UserRole.EMPLOYEE);

    await request(app.getHttpServer())
      .post('/learning-path/recommend')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
  });
});

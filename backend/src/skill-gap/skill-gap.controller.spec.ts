import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { SkillGapController } from './skill-gap.controller';
import { SkillGapService } from './skill-gap.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { UserRole } from '../users/entities/user.entity';

describe('SkillGapController', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const skillGapService = {
    analyze: jest.fn().mockResolvedValue({
      source: 'fallback',
      teamId: 'team-1',
      teamName: 'Finance Team A',
      teamSize: 1,
      teamSummary: [],
      individualBreakdown: [],
      priorityOrder: [],
    }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ JWT_SECRET: 'test-access-secret' })],
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
      ],
      controllers: [SkillGapController],
      providers: [
        { provide: SkillGapService, useValue: skillGapService },
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
      .post('/skill-gap/analyze')
      .send({
        teamId: '11111111-1111-4111-8111-111111111111',
        requiredCourseIds: ['22222222-2222-4222-8222-222222222222'],
      })
      .expect(401);
  });

  it('returns 403 for employee', async () => {
    await request(app.getHttpServer())
      .post('/skill-gap/analyze')
      .set('Authorization', `Bearer ${tokenFor(UserRole.EMPLOYEE)}`)
      .send({
        teamId: '11111111-1111-4111-8111-111111111111',
        requiredCourseIds: ['22222222-2222-4222-8222-222222222222'],
      })
      .expect(403);
  });

  it('returns 400 when requiredCourseIds is empty', async () => {
    await request(app.getHttpServer())
      .post('/skill-gap/analyze')
      .set('Authorization', `Bearer ${tokenFor(UserRole.MANAGER)}`)
      .send({
        teamId: '11111111-1111-4111-8111-111111111111',
        requiredCourseIds: [],
      })
      .expect(400);
  });

  it('returns 201 for manager', async () => {
    const res = await request(app.getHttpServer())
      .post('/skill-gap/analyze')
      .set('Authorization', `Bearer ${tokenFor(UserRole.MANAGER)}`)
      .send({
        teamId: '11111111-1111-4111-8111-111111111111',
        requiredCourseIds: ['22222222-2222-4222-8222-222222222222'],
        frameworkName: 'Compliance track',
      })
      .expect(201);

    expect(res.body.source).toBe('fallback');
    expect(skillGapService.analyze).toHaveBeenCalled();
  });
});

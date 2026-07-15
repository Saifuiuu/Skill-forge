import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { ComplianceAlerterController } from './compliance-alerter.controller';
import { ComplianceAlerterService } from './compliance-alerter.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { UserRole } from '../users/entities/user.entity';

describe('ComplianceAlerterController', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const alerterService = {
    runManually: jest.fn().mockResolvedValue({
      id: 'batch-1',
      source: 'fallback',
      drafts: [],
    }),
    listBatches: jest.fn().mockReturnValue([]),
    getBatch: jest.fn().mockReturnValue({ id: 'batch-1', drafts: [] }),
    sendBatch: jest.fn().mockResolvedValue({ id: 'batch-1', drafts: [] }),
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
      controllers: [ComplianceAlerterController],
      providers: [
        { provide: ComplianceAlerterService, useValue: alerterService },
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
      { sub: 'user-1', email: 'hr@nexara.com', role },
      { secret: 'test-access-secret' },
    );

  it('returns 401 without auth', async () => {
    await request(app.getHttpServer()).post('/compliance-alerter/run').expect(401);
  });

  it('returns 403 for manager', async () => {
    await request(app.getHttpServer())
      .post('/compliance-alerter/run')
      .set('Authorization', `Bearer ${tokenFor(UserRole.MANAGER)}`)
      .expect(403);
  });

  it('returns 201 for HR admin run', async () => {
    const res = await request(app.getHttpServer())
      .post('/compliance-alerter/run')
      .set('Authorization', `Bearer ${tokenFor(UserRole.HR_ADMIN)}`)
      .expect(201);

    expect(res.body.id).toBe('batch-1');
  });

  it('returns 200 for batch list', async () => {
    await request(app.getHttpServer())
      .get('/compliance-alerter/batches')
      .set('Authorization', `Bearer ${tokenFor(UserRole.HR_ADMIN)}`)
      .expect(200);
  });
});

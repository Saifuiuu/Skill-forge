import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { authHeader, createControllerApp } from '../test-utils/controller-test.helper';
import { UserRole } from '../users/entities/user.entity';

describe('ComplianceController', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const complianceService = {
    getTeamCompliance: jest.fn().mockResolvedValue({ teamName: 'T', courseBreakdown: [] }),
    getCompanyCompliance: jest.fn().mockResolvedValue({ heatmap: [] }),
    getComplianceCsv: jest.fn().mockResolvedValue('Department,Employee\n'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    ({ app, jwtService } = await createControllerApp({
      controllers: [ComplianceController],
      providers: [{ provide: ComplianceService, useValue: complianceService }],
    }));
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /compliance/team returns 401 without token', async () => {
    await request(app.getHttpServer()).get('/compliance/team').expect(401);
  });

  it('GET /compliance/team returns 403 for employee', async () => {
    await request(app.getHttpServer())
      .get('/compliance/team')
      .set(authHeader(jwtService, UserRole.EMPLOYEE))
      .expect(403);
  });

  it('GET /compliance/team returns 200 for manager', async () => {
    await request(app.getHttpServer())
      .get('/compliance/team')
      .set(authHeader(jwtService, UserRole.MANAGER))
      .expect(200);
  });

  it('GET /compliance/company returns 403 for manager', async () => {
    await request(app.getHttpServer())
      .get('/compliance/company')
      .set(authHeader(jwtService, UserRole.MANAGER))
      .expect(403);
  });

  it('GET /compliance/company returns 200 for HR', async () => {
    await request(app.getHttpServer())
      .get('/compliance/company')
      .set(authHeader(jwtService, UserRole.HR_ADMIN))
      .expect(200);
  });

  it('GET /compliance/company/export returns 200 CSV for HR', async () => {
    const res = await request(app.getHttpServer())
      .get('/compliance/company/export')
      .set(authHeader(jwtService, UserRole.HR_ADMIN))
      .expect(200);
    expect(res.headers['content-type']).toMatch(/csv/);
  });
});

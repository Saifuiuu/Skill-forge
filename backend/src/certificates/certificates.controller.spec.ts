import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { authHeader, createControllerApp } from '../test-utils/controller-test.helper';
import { UserRole } from '../users/entities/user.entity';

describe('CertificatesController', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const certificatesService = {
    findMine: jest.fn().mockResolvedValue([]),
    getFilePathById: jest.fn().mockResolvedValue('/tmp/missing.pdf'),
    verifyByCode: jest.fn().mockResolvedValue({
      valid: true,
      employeeName: 'Jordan',
      courseTitle: 'AML',
      verificationCode: 'ABC123',
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    ({ app, jwtService } = await createControllerApp({
      controllers: [CertificatesController],
      providers: [{ provide: CertificatesService, useValue: certificatesService }],
    }));
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /certificates/mine returns 401 without token', async () => {
    await request(app.getHttpServer()).get('/certificates/mine').expect(401);
  });

  it('GET /certificates/mine returns 200 with token', async () => {
    await request(app.getHttpServer())
      .get('/certificates/mine')
      .set(authHeader(jwtService, UserRole.EMPLOYEE))
      .expect(200);
  });

  it('GET /certificates/verify/:code returns 200 without token (public)', async () => {
    const res = await request(app.getHttpServer())
      .get('/certificates/verify/ABC123')
      .expect(200);
    expect(res.body.valid).toBe(true);
  });
});

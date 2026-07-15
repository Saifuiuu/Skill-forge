import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { authHeader, createControllerApp } from './test-utils/controller-test.helper';
import { UserRole } from './users/entities/user.entity';

describe('AppController', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeEach(async () => {
    ({ app, jwtService } = await createControllerApp({
      controllers: [AppController],
      providers: [AppService],
    }));
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health returns 200 without auth (public)', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /health still works with a token', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .set(authHeader(jwtService, UserRole.EMPLOYEE))
      .expect(200);
  });
});

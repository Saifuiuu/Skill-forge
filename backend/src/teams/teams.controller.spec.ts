import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { authHeader, createControllerApp } from '../test-utils/controller-test.helper';
import { UserRole } from '../users/entities/user.entity';

describe('TeamsController', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const teamsService = {
    create: jest.fn().mockResolvedValue({ id: 1, name: 'Team A' }),
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: 1 }),
    update: jest.fn().mockResolvedValue({ id: 1 }),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    ({ app, jwtService } = await createControllerApp({
      controllers: [TeamsController],
      providers: [{ provide: TeamsService, useValue: teamsService }],
    }));
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /teams returns 401 without token', async () => {
    await request(app.getHttpServer()).get('/teams').expect(401);
  });

  it('GET /teams returns 200 with token', async () => {
    await request(app.getHttpServer())
      .get('/teams')
      .set(authHeader(jwtService, UserRole.MANAGER))
      .expect(200);
  });
});

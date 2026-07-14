import { INestApplication, Provider, Type, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { UserRole } from '../users/entities/user.entity';

export const TEST_JWT_SECRET = 'test-access-secret';

export async function createControllerApp(options: {
  controllers: Type<unknown>[];
  providers: Provider[];
}): Promise<{ app: INestApplication; jwtService: JwtService; module: TestingModule }> {
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [() => ({ JWT_SECRET: TEST_JWT_SECRET })],
      }),
      PassportModule.register({ defaultStrategy: 'jwt' }),
    ],
    controllers: options.controllers,
    providers: [...options.providers, JwtStrategy, JwtService, Reflector],
  }).compile();

  const app = module.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector), new RolesGuard(reflector));
  await app.init();

  return { app, jwtService: app.get(JwtService), module };
}

export function tokenFor(
  jwtService: JwtService,
  role: UserRole | string,
  userId = 'user-1',
) {
  return jwtService.sign(
    { sub: userId, email: 'test@nexara.com', role },
    { secret: TEST_JWT_SECRET },
  );
}

export function authHeader(jwtService: JwtService, role: UserRole | string) {
  return { Authorization: `Bearer ${tokenFor(jwtService, role)}` };
}

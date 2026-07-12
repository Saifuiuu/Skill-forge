import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      // Request ke 'Authorization' header se Bearer token nikalna
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // .env se secret key uthana
      secretOrKey: configService.get<string>('JWT_SECRET')!, 
    });
  }

  // Agar token valid hai, toh yeh method chalega aur payload return karega
  async validate(payload: any) {
    if (!payload) {
      throw new UnauthorizedException();
    }
    // Yeh return object request.user ban jayega (RolesGuard isay hi check karega)
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
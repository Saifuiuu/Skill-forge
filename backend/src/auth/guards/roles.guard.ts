import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true; // Agar route par @Roles() nahi laga, toh sab allow hain
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    // User object lazmi hona chahiye (JWT Auth Guard is se pehle chalega)
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Aapke paas is action ki permission nahi hai');
    }
    
    return true;
  }
}
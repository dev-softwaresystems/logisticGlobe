import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser } from '@logistics-globe/shared';
import { AuthService } from './auth.service.js';
export interface AuthenticatedRequest extends Request {
  user?: CurrentUser;
}
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.header('authorization');
    if (!header?.startsWith('Bearer ') || header.length > 4096)
      throw new UnauthorizedException('Authentication required');
    request.user = await this.auth.authenticate(header.slice(7));
    return true;
  }
}

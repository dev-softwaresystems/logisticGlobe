import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { RuntimeEnvironment } from '../config/environment.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './login.dto.js';
import { AccessGuard } from './access.guard.js';
import type { AuthenticatedRequest } from './access.guard.js';
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(ConfigService)
    private readonly config: ConfigService<RuntimeEnvironment, true>,
  ) {}
  private checkOrigin(request: Request): void {
    const origin = request.header('origin');
    if (origin && origin !== this.config.get('WEB_ORIGIN', { infer: true }))
      throw new ForbiddenException('Origin not allowed');
  }
  private cookie(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const token = cookies?.lg_refresh;
    return typeof token === 'string' && token.length <= 4096
      ? token
      : undefined;
  }
  private setCookie(
    response: Response,
    refreshToken: string,
    expiresAt: Date,
  ): void {
    response.cookie('lg_refresh', refreshToken, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth',
      expires: expiresAt,
    });
  }
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiBody({ type: LoginDto })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.checkOrigin(request);
    const session = await this.auth.login(dto);
    this.setCookie(response, session.refreshToken, session.expiresAt);
    response.setHeader('Cache-Control', 'no-store');
    return { accessToken: session.accessToken, user: session.user };
  }
  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.checkOrigin(request);
    const token = this.cookie(request);
    if (!token) throw new UnauthorizedException('Authentication required');
    const session = await this.auth.refresh(token);
    this.setCookie(response, session.refreshToken, session.expiresAt);
    response.setHeader('Cache-Control', 'no-store');
    return { accessToken: session.accessToken, user: session.user };
  }
  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.checkOrigin(request);
    await this.auth.logout(this.cookie(request));
    response.clearCookie('lg_refresh', {
      httpOnly: true,
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth',
    });
  }
  @Get('me')
  @UseGuards(AccessGuard)
  @ApiBearerAuth()
  me(@Req() request: AuthenticatedRequest) {
    return request.user;
  }
}

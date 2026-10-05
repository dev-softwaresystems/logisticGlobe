import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import type { CurrentUser } from '@logistics-globe/shared';
import { PrismaService } from '../infrastructure/database/prisma.service.js';
import { durationSeconds } from '../config/environment.js';
import type { RuntimeEnvironment } from '../config/environment.js';
import type { LoginDto } from './login.dto.js';
interface TokenClaims {
  sub: string;
  sid: string;
  use: 'access' | 'refresh';
}
interface SessionUser {
  id: string;
  email: string;
  name: string;
  roles: { name: CurrentUser['roles'][number] }[];
}
const hash = (token: string) =>
  createHash('sha256').update(token).digest('hex');
@Injectable()
export class AuthService {
  private readonly dummyHash = bcrypt.hash('invalid-password-placeholder', 12);
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(ConfigService)
    private readonly config: ConfigService<RuntimeEnvironment, true>,
  ) {}
  private currentUser(user: SessionUser): CurrentUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles.map((role) => role.name),
    };
  }
  private async tokens(userId: string, sessionId: string) {
    const refreshSeconds = durationSeconds(
      this.config.get('JWT_REFRESH_EXPIRES_IN', { infer: true }),
    );
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: userId, sid: sessionId, use: 'access' },
        {
          secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
          expiresIn: durationSeconds(
            this.config.get('JWT_ACCESS_EXPIRES_IN', { infer: true }),
          ),
          issuer: 'LogisticsGlobe',
          audience: 'LogisticsGlobe.web',
          algorithm: 'HS256',
        },
      ),
      this.jwt.signAsync(
        { sub: userId, sid: sessionId, use: 'refresh', jti: randomUUID() },
        {
          secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
          expiresIn: refreshSeconds,
          issuer: 'LogisticsGlobe',
          audience: 'LogisticsGlobe.auth',
          algorithm: 'HS256',
        },
      ),
    ]);
    return {
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + refreshSeconds * 1000),
    };
  }
  private async verify(
    token: string,
    use: TokenClaims['use'],
  ): Promise<TokenClaims> {
    try {
      const claims = await this.jwt.verifyAsync<TokenClaims>(token, {
        secret: this.config.get(
          use === 'access' ? 'JWT_ACCESS_SECRET' : 'JWT_REFRESH_SECRET',
          { infer: true },
        ),
        issuer: 'LogisticsGlobe',
        audience:
          use === 'access' ? 'LogisticsGlobe.web' : 'LogisticsGlobe.auth',
        algorithms: ['HS256'],
      });
      if (
        claims.use !== use ||
        typeof claims.sub !== 'string' ||
        typeof claims.sid !== 'string'
      )
        throw new Error('Invalid claims');
      return claims;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
  async login(dto: LoginDto) {
    if (Buffer.byteLength(dto.password, 'utf8') > 72)
      throw new UnauthorizedException('Invalid email or password');
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
      include: { roles: true },
    });
    const valid = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? (await this.dummyHash),
    );
    if (!valid || !user?.active)
      throw new UnauthorizedException('Invalid email or password');
    const id = randomUUID();
    const tokens = await this.tokens(user.id, id);
    await this.prisma.refreshSession.create({
      data: {
        id,
        userId: user.id,
        tokenHash: hash(tokens.refreshToken),
        expiresAt: tokens.expiresAt,
      },
    });
    return { ...tokens, user: this.currentUser(user) };
  }
  async refresh(token: string) {
    const claims = await this.verify(token, 'refresh');
    const session = await this.prisma.refreshSession.findUnique({
      where: { id: claims.sid },
      include: { user: { include: { roles: true } } },
    });
    if (
      !session ||
      session.userId !== claims.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !session.user.active
    )
      throw new UnauthorizedException('Invalid or expired session');
    const tokens = await this.tokens(claims.sub, claims.sid);
    const updated = await this.prisma.refreshSession.updateMany({
      where: {
        id: claims.sid,
        tokenHash: hash(token),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        tokenHash: hash(tokens.refreshToken),
        expiresAt: tokens.expiresAt,
      },
    });
    if (updated.count !== 1)
      throw new UnauthorizedException('Invalid or expired session');
    return { ...tokens, user: this.currentUser(session.user) };
  }
  async authenticate(token: string): Promise<CurrentUser> {
    const claims = await this.verify(token, 'access');
    const session = await this.prisma.refreshSession.findUnique({
      where: { id: claims.sid },
      include: { user: { include: { roles: true } } },
    });
    if (
      !session ||
      session.userId !== claims.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !session.user.active
    )
      throw new UnauthorizedException('Invalid or expired session');
    return this.currentUser(session.user);
  }
  async logout(token?: string): Promise<void> {
    if (!token) return;
    let claims: TokenClaims;
    try {
      claims = await this.verify(token, 'refresh');
    } catch {
      return;
    }
    await this.prisma.refreshSession.updateMany({
      where: { id: claims.sid, userId: claims.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

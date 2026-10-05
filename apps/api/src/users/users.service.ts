import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../infrastructure/database/prisma.service.js';
import { serializable } from '../common/transaction.js';
import type { CreateUserDto, UpdateUserDto, UsersQuery } from './users.dto.js';
const publicUser = {
  id: true,
  email: true,
  name: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  roles: { select: { name: true } },
} as const;
function present(user: {
  id: string;
  email: string;
  name: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  roles: { name: string }[];
}) {
  return { ...user, roles: user.roles.map((role) => role.name) };
}
@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  async list(query: UsersQuery) {
    const where: Prisma.UserWhereInput = {
      ...(query.state ? { active: query.state === 'active' } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: publicUser,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: query.pageSize,
        skip: (query.page - 1) * query.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: items.map(present),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
  async create(dto: CreateUserDto, actorId: string) {
    if (Buffer.byteLength(dto.password, 'utf8') > 72)
      throw new BadRequestException('Password exceeds safe UTF-8 byte limit');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    try {
      return await serializable(this.prisma, async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email,
            name: dto.name,
            passwordHash,
            roles: { connect: dto.roles.map((name) => ({ name })) },
          },
          select: publicUser,
        });
        await tx.auditLog.create({
          data: {
            actorId,
            targetId: user.id,
            action: 'user.created',
            changes: { roles: dto.roles, active: true },
          },
        });
        return present(user);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('Email already registered');
      throw error;
    }
  }
  async update(id: string, dto: UpdateUserDto, actorId: string) {
    return serializable(this.prisma, async (tx) => {
      const before = await tx.user.findUnique({
        where: { id },
        select: publicUser,
      });
      if (!before) throw new NotFoundException('User not found');
      if (
        before.updatedAt.toISOString() !==
        new Date(dto.expectedUpdatedAt).toISOString()
      )
        throw new ConflictException('User changed. Reload before editing.');
      if (
        before.active &&
        before.roles.some((role) => role.name === 'ADMIN') &&
        (!dto.active || !dto.roles.includes('ADMIN'))
      ) {
        const otherAdmins = await tx.user.count({
          where: {
            id: { not: id },
            active: true,
            roles: { some: { name: 'ADMIN' } },
          },
        });
        if (!otherAdmins)
          throw new ConflictException(
            'At least one active administrator is required',
          );
      }
      const user = await tx.user.update({
        where: { id },
        data: {
          name: dto.name,
          active: dto.active,
          roles: { set: dto.roles.map((name) => ({ name })) },
        },
        select: publicUser,
      });
      const permissionsChanged =
        before.active !== dto.active ||
        before.roles
          .map((role) => role.name)
          .sort()
          .join(',') !== [...dto.roles].sort().join(',');
      if (permissionsChanged)
        await tx.refreshSession.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      await tx.auditLog.create({
        data: {
          actorId,
          targetId: id,
          action: 'user.updated',
          changes: {
            active: dto.active,
            roles: dto.roles,
            nameChanged: before.name !== dto.name,
          },
        },
      });
      return present(user);
    });
  }
  async audit(id: string, query: UsersQuery) {
    if (
      !(await this.prisma.user.findUnique({
        where: { id },
        select: { id: true },
      }))
    )
      throw new NotFoundException('User not found');
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where: { targetId: id },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: query.pageSize,
        skip: (query.page - 1) * query.pageSize,
      }),
      this.prisma.auditLog.count({ where: { targetId: id } }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }
}

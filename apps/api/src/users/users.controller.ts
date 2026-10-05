import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AccessGuard } from '../auth/access.guard.js';
import type { AuthenticatedRequest } from '../auth/access.guard.js';
import { Roles, RolesGuard } from '../auth/roles.guard.js';
import { UsersService } from './users.service.js';
import {
  CreateUserDto,
  UpdateUserDto,
  UsersQuery,
  USER_ROLES,
} from './users.dto.js';
@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AccessGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}
  @Get('roles') roles() {
    return USER_ROLES;
  }
  @Get() list(@Query() query: UsersQuery) {
    return this.users.list(query);
  }
  @Post()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  create(@Body() dto: CreateUserDto, @Req() req: AuthenticatedRequest) {
    return this.users.create(dto, req.user!.id);
  }
  @Patch(':id') update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.users.update(id, dto, req.user!.id);
  }
  @Get(':id/audit') audit(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: UsersQuery,
  ) {
    return this.users.audit(id, query);
  }
}

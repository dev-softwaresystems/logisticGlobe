import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AccessGuard } from './access.guard.js';
import { RolesGuard } from './roles.guard.js';
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, AccessGuard, RolesGuard],
  exports: [AuthService, AccessGuard, RolesGuard],
})
export class AuthModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { OperationsGateway } from '../websocket/operations.gateway.js';
import { OutboxDispatcher } from './outbox.js';
@Module({
  imports: [AuthModule],
  providers: [OperationsGateway, OutboxDispatcher],
})
export class MessagingModule {}

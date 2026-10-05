import { Inject, OnModuleDestroy } from '@nestjs/common';
import { OnGatewayInit, WebSocketGateway } from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import type { Namespace, Socket } from 'socket.io';
import type { ClientEvents, ServerEvents } from '@logistics-globe/shared';
import { AuthService } from '../../auth/auth.service.js';
import { READ_ROLES } from '../../common/roles.js';
import { LocalEventBus } from '../messaging/event-bus.js';
import type { RuntimeEnvironment } from '../../config/environment.js';
type OperationsSocket = Socket<
  ClientEvents,
  ServerEvents,
  ServerEvents,
  { token: string }
>;
@WebSocketGateway({ namespace: '/operations', maxHttpBufferSize: 16384 })
export class OperationsGateway implements OnGatewayInit, OnModuleDestroy {
  private unsubscribe?: () => void;
  private timer?: ReturnType<typeof setInterval>;
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(LocalEventBus) private readonly bus: LocalEventBus,
    @Inject(ConfigService)
    private readonly config: ConfigService<RuntimeEnvironment, true>,
  ) {}
  afterInit(
    server: Namespace<
      ClientEvents,
      ServerEvents,
      ServerEvents,
      { token: string }
    >,
  ) {
    server.use((socket, next) => {
      void this.authorize(socket)
        .then(() => next())
        .catch(() => next(new Error('Authentication required')));
    });
    this.unsubscribe = this.bus.subscribe(async (event) => {
      await Promise.all(
        [...server.sockets.values()].map(async (socket) => {
          try {
            await this.authorize(socket);
            socket.emit('event', event);
          } catch {
            socket.disconnect(true);
          }
        }),
      );
    });
    this.timer = setInterval(() => {
      void Promise.all(
        [...server.sockets.values()].map(async (socket) => {
          try {
            await this.authorize(socket);
          } catch {
            socket.disconnect(true);
          }
        }),
      );
    }, 30000);
    this.timer.unref();
  }
  private async authorize(socket: OperationsSocket) {
    const origin = socket.handshake.headers.origin;
    if (origin && origin !== this.config.get('WEB_ORIGIN', { infer: true }))
      throw new Error('Invalid origin');
    const raw = socket.handshake.auth.token as unknown;
    if (typeof raw !== 'string' || raw.length > 4096)
      throw new Error('Invalid token');
    const user = await this.auth.authenticate(raw);
    if (!user.roles.some((role) => READ_ROLES.includes(role)))
      throw new Error('Role required');
    socket.data.token = raw;
  }
  onModuleDestroy() {
    this.unsubscribe?.();
    if (this.timer) clearInterval(this.timer);
  }
}

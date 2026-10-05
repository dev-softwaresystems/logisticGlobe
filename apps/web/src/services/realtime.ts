import { io } from 'socket.io-client';
import type {
  ClientEvents,
  LogisticsEvent,
  ServerEvents,
} from '@logistics-globe/shared';
import type { Socket } from 'socket.io-client';
import { environment } from '../lib/environment';
import { getAccessToken, refreshSession } from './http';
export function connectRealtime(
  onEvent: (event: LogisticsEvent) => void,
  onState: (state: 'connected' | 'reconnecting') => void,
): () => void {
  let closed = false;
  let retry: ReturnType<typeof setTimeout> | undefined;
  const socket: Socket<ServerEvents, ClientEvents> = io(
    environment.wsUrl + '/operations',
    {
      autoConnect: false,
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
      auth: (callback) => {
        const token = getAccessToken();
        if (token && !closed) {
          callback({ token });
          return;
        }
        void refreshSession()
          .then((data) => {
            if (!closed) callback({ token: data.accessToken });
          })
          .catch(() => {
            onState('reconnecting');
          });
      },
    },
  );
  socket.on('event', onEvent);
  socket.on('connect', () => onState('connected'));
  socket.on('connect_error', () => {
    onState('reconnecting');
    if (!closed) {
      if (retry) clearTimeout(retry);
      retry = setTimeout(() => {
        void refreshSession()
          .then(() => {
            if (!closed) socket.connect();
          })
          .catch(() => {
            if (!closed) socket.connect();
          });
      }, 5000);
    }
  });
  socket.on('disconnect', (reason) => {
    onState('reconnecting');
    if (reason === 'io server disconnect' && !closed)
      retry = setTimeout(() => socket.connect(), 5000);
  });
  const renewal = setInterval(
    () => {
      if (!closed)
        void refreshSession()
          .then(() => {
            if (!closed) socket.disconnect().connect();
          })
          .catch(() => onState('reconnecting'));
    },
    10 * 60 * 1000,
  );
  socket.connect();
  return () => {
    closed = true;
    if (retry) clearTimeout(retry);
    clearInterval(renewal);
    socket.removeAllListeners();
    socket.disconnect();
  };
}

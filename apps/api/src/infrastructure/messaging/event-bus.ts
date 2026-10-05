import { Injectable } from '@nestjs/common';
import type {
  EventBus,
  LogisticsEvent,
  LogisticsEventName,
} from '@logistics-globe/shared';
export const EVENT_BUS = Symbol('LOGISTICS_EVENT_BUS');
@Injectable()
export class LocalEventBus implements EventBus {
  private readonly listeners = new Set<
    (event: LogisticsEvent) => Promise<void>
  >();
  subscribe(listener: (event: LogisticsEvent) => Promise<void>): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  async publish<K extends LogisticsEventName>(
    event: LogisticsEvent<K>,
  ): Promise<void> {
    await Promise.all(
      [...this.listeners].map((listener) =>
        listener(event as unknown as LogisticsEvent),
      ),
    );
  }
}

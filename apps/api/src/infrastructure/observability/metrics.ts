import {
  Registry,
  Counter,
  Histogram,
  collectDefaultMetrics,
} from '@prometheus-io/client';
export const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: 'logistics_' });
export const requests = new Counter({
  name: 'logistics_http_requests_total',
  help: 'Completed HTTP requests',
  labelNames: ['method', 'status'] as const,
  registers: [registry],
});
export const duration = new Histogram({
  name: 'logistics_http_duration_seconds',
  help: 'HTTP duration in seconds',
  labelNames: ['method', 'status'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});
export const routingDuration = new Histogram({
  name: 'logistics_routing_duration_seconds',
  help: 'Routing adapter duration including cache lookup',
  labelNames: ['result'] as const,
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});
export function observeRequest(
  method: string,
  status: number,
  seconds: number,
) {
  const labels = {
    method: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'HEAD',
      'OPTIONS',
    ].includes(method)
      ? method
      : 'OTHER',
    status: String(status),
  };
  requests.inc(labels);
  duration.observe(labels, seconds);
}

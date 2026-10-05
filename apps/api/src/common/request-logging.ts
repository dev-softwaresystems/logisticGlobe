import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { observeRequest } from '../infrastructure/observability/metrics.js';
const logger = new Logger('HTTP');
export function requestLogging(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const incoming = request.header('x-request-id');
  const id =
    incoming && /^[a-zA-Z0-9-]{1,64}$/.test(incoming) ? incoming : randomUUID();
  response.setHeader('x-request-id', id);
  const start = performance.now();
  response.once('finish', () => {
    observeRequest(
      request.method,
      response.statusCode,
      (performance.now() - start) / 1000,
    );
    logger.log({
      event: 'request.completed',
      requestId: id,
      method: request.method,
      statusCode: response.statusCode,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
    });
  });
  next();
}

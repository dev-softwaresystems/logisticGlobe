import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] =
      statusCode >= 500
        ? 'Service temporarily unavailable'
        : 'Request rejected';
    if (exception instanceof HttpException && statusCode < 500) {
      const body = exception.getResponse();
      if (typeof body === 'string') message = body;
      else if (
        'message' in body &&
        (typeof body.message === 'string' || Array.isArray(body.message))
      )
        message = body.message as string | string[];
    }
    if (statusCode >= 500)
      this.logger.error({
        event: 'request.failed',
        requestId: response.getHeader('x-request-id'),
        statusCode,
      });
    response.status(statusCode).json({
      statusCode,
      message,
      requestId: response.getHeader('x-request-id'),
      timestamp: new Date().toISOString(),
    });
  }
}

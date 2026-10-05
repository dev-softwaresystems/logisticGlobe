import { ConfiguredIoAdapter } from '../infrastructure/websocket/configured-io.adapter.js';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter.js';
import { requestLogging } from '../common/request-logging.js';
import type { RuntimeEnvironment } from './environment.js';
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService<RuntimeEnvironment, true>);
  app.setGlobalPrefix('api/v1');
  const adapter = app.getHttpAdapter();
  (adapter.getInstance() as { set(key: string, value: unknown): void }).set(
    'trust proxy',
    config.get('TRUST_PROXY_HOPS', { infer: true }),
  );
  app.useWebSocketAdapter(new ConfiguredIoAdapter(app));
  app.use(helmet());
  app.use(cookieParser());
  app.use(requestLogging);
  app.enableCors({
    origin: config.get('WEB_ORIGIN', { infer: true }),
    credentials: true,
    exposedHeaders: ['x-request-id'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    const options = new DocumentBuilder()
      .setTitle('LogisticsGlobe API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(
      'api/docs',
      app,
      SwaggerModule.createDocument(app, options),
    );
  }
}

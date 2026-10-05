import { ConsoleLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './config/configure-app.js';
import type { RuntimeEnvironment } from './config/environment.js';
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({ json: true }),
  });
  configureApp(app);
  await app.listen(
    app
      .get(ConfigService<RuntimeEnvironment, true>)
      .get('PORT', { infer: true }),
  );
}
await bootstrap();

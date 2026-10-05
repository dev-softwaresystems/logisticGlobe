import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mongoose from 'mongoose';
import type { RuntimeEnvironment } from '../../config/environment.js';
@Injectable()
export class MongoService implements OnModuleDestroy {
  private readonly connection = mongoose.createConnection();
  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService<RuntimeEnvironment, true>,
  ) {}
  async ping(): Promise<void> {
    if (this.connection.readyState === 0) {
      await this.connection.openUri(
        this.config.get('MONGODB_URI', { infer: true }),
        {
          serverSelectionTimeoutMS: 1500,
          connectTimeoutMS: 1500,
          socketTimeoutMS: 1500,
        },
      );
    } else if (this.connection.readyState === 2)
      await this.connection.asPromise();
    if (!this.connection.db) throw new Error('MongoDB unavailable');
    await this.connection.db.admin().ping();
  }
  async collection<T extends mongoose.mongo.Document>(name: string) {
    await this.ping();
    if (!this.connection.db) throw new Error('MongoDB unavailable');
    return this.connection.db.collection<T>(name);
  }
  async onModuleDestroy(): Promise<void> {
    await this.connection.close();
  }
}

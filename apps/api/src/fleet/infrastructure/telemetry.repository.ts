import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import type { Position, PositionSource } from '@logistics-globe/shared';
import { MongoService } from '../../infrastructure/database/mongo.service.js';
import { RedisService } from '../../infrastructure/cache/redis.service.js';
import type { PositionDto, PositionQuery } from '../fleet.dto.js';
interface TelemetryDocument extends Position {
  _id: string;
  actorId?: string;
  monitoringPending?: boolean;
  accuracyMeters?: number;
}
@Injectable()
export class TelemetryRepository implements OnModuleInit {
  private readonly logger = new Logger(TelemetryRepository.name);
  private ready?: Promise<void>;
  constructor(
    @Inject(MongoService) private readonly mongo: MongoService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}
  onModuleInit() {
    void this.ensureIndexes().catch(() => {
      this.logger.warn('Telemetry indexes deferred until MongoDB recovers');
    });
  }
  private async collection() {
    return this.mongo.collection<TelemetryDocument>('vehicle_telemetry');
  }
  private async ensureIndexes() {
    if (!this.ready)
      this.ready = this.collection()
        .then(async (collection) => {
          await collection.createIndex({
            vehicleId: 1,
            observedAt: -1,
            _id: -1,
          });
          await collection.createIndex({ monitoringPending: 1, observedAt: 1 });
        })
        .catch((error) => {
          this.ready = undefined;
          throw error;
        });
    await this.ready;
  }
  private publicPosition(doc: TelemetryDocument): Position {
    return {
      source: doc.source,
      speedKph: doc.speedKph,
      headingDegrees: doc.headingDegrees,
      id: doc.id,
      vehicleId: doc.vehicleId,
      latitude: doc.latitude,
      longitude: doc.longitude,
      observedAt: doc.observedAt,
      receivedAt: doc.receivedAt,
      ...(doc.accuracyMeters === undefined
        ? {}
        : { accuracyMeters: doc.accuracyMeters }),
    };
  }
  async save(
    vehicleId: string,
    dto: PositionDto,
    origin?: { source: PositionSource; actorId?: string },
  ) {
    await this.ensureIndexes();
    const observedAt = new Date(dto.observedAt).toISOString();
    if (new Date(observedAt).getTime() > Date.now() + 60000)
      throw new BadRequestException('Observation is in the future');
    const collection = await this.collection();
    const document: TelemetryDocument = {
      ...origin,
      ...(dto.speedKph === undefined ? {} : { speedKph: dto.speedKph }),
      ...(dto.headingDegrees === undefined
        ? {}
        : { headingDegrees: dto.headingDegrees }),
      id: dto.id,
      latitude: dto.latitude,
      longitude: dto.longitude,
      vehicleId,
      observedAt,
      receivedAt: new Date().toISOString(),
      _id: dto.id,
      monitoringPending: true,
      ...(dto.accuracyMeters === undefined
        ? {}
        : { accuracyMeters: dto.accuracyMeters }),
    };
    const result = await collection.updateOne(
      { _id: dto.id },
      { $setOnInsert: document },
      { upsert: true },
    );
    if (!result.upsertedCount) {
      const existing = await collection.findOne({ _id: dto.id });
      if (
        !existing ||
        existing.vehicleId !== vehicleId ||
        existing.latitude !== dto.latitude ||
        existing.longitude !== dto.longitude ||
        existing.observedAt !== observedAt ||
        existing.accuracyMeters !== dto.accuracyMeters ||
        (existing.speedKph ?? undefined) !== dto.speedKph ||
        (existing.headingDegrees ?? undefined) !== dto.headingDegrees ||
        (existing.source !== undefined && existing.source !== origin?.source) ||
        (existing.actorId !== undefined && existing.actorId !== origin?.actorId)
      )
        throw new ConflictException(
          'Observation ID already used with different data',
        );
      return { position: this.publicPosition(existing), created: false };
    }
    const position = this.publicPosition(document);
    try {
      const latest = await collection.findOne(
        { vehicleId },
        { sort: { observedAt: -1, _id: -1 } },
      );
      if (latest)
        await this.redis.setLatest(
          'fleet:position:' + vehicleId,
          this.publicPosition(latest),
          5,
        );
    } catch {
      this.logger.warn(
        'Position cache write skipped; MongoDB remains authoritative',
      );
    }
    return { position, created: true };
  }
  async complete(id: string) {
    await (
      await this.collection()
    ).updateOne({ _id: id }, { $set: { monitoringPending: false } });
  }
  async pending() {
    await this.ensureIndexes();
    const docs = await (
      await this.collection()
    )
      .find({ monitoringPending: true })
      .sort({ observedAt: 1, _id: 1 })
      .limit(100)
      .toArray();
    return docs.map((doc) => this.publicPosition(doc));
  }
  async latest(vehicleId: string): Promise<Position | null> {
    try {
      const cached = await this.redis.get('fleet:position:' + vehicleId);
      if (cached) return JSON.parse(cached) as Position;
    } catch {
      /* Read through to durable storage. */
    }
    await this.ensureIndexes();
    const doc = await (
      await this.collection()
    ).findOne({ vehicleId }, { sort: { observedAt: -1, _id: -1 } });
    return doc ? this.publicPosition(doc) : null;
  }
  async history(vehicleId: string, query: PositionQuery) {
    if (query.from && query.to && new Date(query.from) > new Date(query.to))
      throw new BadRequestException('Invalid date interval');
    const filter = {
      vehicleId,
      ...(query.from || query.to
        ? {
            observedAt: {
              ...(query.from
                ? { $gte: new Date(query.from).toISOString() }
                : {}),
              ...(query.to ? { $lte: new Date(query.to).toISOString() } : {}),
            },
          }
        : {}),
    };
    const collection = await this.collection();
    const [docs, total] = await Promise.all([
      collection
        .find(filter)
        .sort({ observedAt: -1, _id: -1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .toArray(),
      collection.countDocuments(filter),
    ]);
    return {
      items: docs.map((doc) => this.publicPosition(doc)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}

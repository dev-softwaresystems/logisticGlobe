import {
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { RoutingRequest, RoutingResult } from '@logistics-globe/shared';
export interface RoutingProvider {
  route(input: RoutingRequest): Promise<Omit<RoutingResult, 'cached'>>;
}
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
export class OsrmAdapter implements RoutingProvider {
  constructor(private readonly origin: string) {}
  async route(input: RoutingRequest): Promise<Omit<RoutingResult, 'cached'>> {
    if (!this.origin)
      throw new ServiceUnavailableException(
        'Routing provider is not configured',
      );
    const { origin, destination } = input;
    const path =
      '/route/v1/driving/' +
      origin.longitude +
      ',' +
      origin.latitude +
      ';' +
      destination.longitude +
      ',' +
      destination.latitude;
    let response: Response;
    let data: unknown;
    try {
      response = await fetch(
        new URL(
          path + '?overview=full&geometries=geojson&steps=false',
          this.origin,
        ),
        { signal: AbortSignal.timeout(2000), redirect: 'error' },
      );
      if (
        (!response.ok && response.status !== 400) ||
        Number(response.headers.get('content-length') ?? 0) > 1024 * 1024
      )
        throw new Error('Invalid response');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Missing response');
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 1024 * 1024) {
          await reader.cancel();
          throw new Error('Response too large');
        }
        chunks.push(value);
      }
      data = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    } catch {
      throw new ServiceUnavailableException('Routing provider unavailable');
    }
    if (record(data) && data.code === 'NoRoute')
      throw new UnprocessableEntityException('No drivable route was found');
    if (
      !response.ok ||
      !record(data) ||
      data.code !== 'Ok' ||
      !Array.isArray(data.routes) ||
      !record(data.routes[0])
    )
      throw new ServiceUnavailableException('Invalid routing response');
    const route = data.routes[0];
    const geometry = route.geometry;
    if (
      typeof route.distance !== 'number' ||
      !Number.isFinite(route.distance) ||
      route.distance < 0 ||
      typeof route.duration !== 'number' ||
      !Number.isFinite(route.duration) ||
      route.duration < 0 ||
      !record(geometry) ||
      geometry.type !== 'LineString' ||
      !Array.isArray(geometry.coordinates) ||
      geometry.coordinates.length < 2 ||
      geometry.coordinates.length > 10000
    )
      throw new ServiceUnavailableException('Invalid routing response');
    const coordinates: [number, number][] = [];
    for (const point of geometry.coordinates) {
      if (
        !Array.isArray(point) ||
        point.length !== 2 ||
        !point.every(
          (value) => typeof value === 'number' && Number.isFinite(value),
        ) ||
        Math.abs(point[0] as number) > 180 ||
        Math.abs(point[1] as number) > 90
      )
        throw new ServiceUnavailableException('Invalid route geometry');
      coordinates.push([point[0] as number, point[1] as number]);
    }
    return {
      provider: 'osrm',
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      coordinates,
      calculatedAt: new Date().toISOString(),
    };
  }
}

import { randomBytes } from 'node:crypto';
if (!process.env.TEST_DATABASE_URL)
  throw new Error(
    'TEST_DATABASE_URL must point to a dedicated integration database with migrations applied',
  );
if (!new URL(process.env.TEST_DATABASE_URL).pathname.endsWith('_test'))
  throw new Error(
    'Integration tests require a dedicated database ending in _test',
  );
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex');
process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
process.env.MONGODB_URI ??= 'mongodb://localhost:27017/logistics_test';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.WEB_ORIGIN = 'http://localhost:5173';

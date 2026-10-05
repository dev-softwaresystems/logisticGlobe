import { randomBytes } from 'node:crypto';
import { durationSeconds, validateEnvironment } from './environment.js';
const valid = () => ({
  DATABASE_URL: 'postgresql://localhost/logistics',
  JWT_ACCESS_SECRET: randomBytes(32).toString('hex'),
  JWT_REFRESH_SECRET: randomBytes(32).toString('hex'),
});
describe('Environment validation', () => {
  it('validates defaults and token lifetimes', () => {
    expect(validateEnvironment(valid()).PORT).toBe(3000);
    expect(durationSeconds('15m')).toBe(900);
  });
  it('fails safely without leaking provided configuration', () => {
    expect(() =>
      validateEnvironment({
        ...valid(),
        DATABASE_URL: 'sensitive-connection',
        PORT: -1,
      }),
    ).toThrow('DATABASE_URL');
    try {
      validateEnvironment({ ...valid(), DATABASE_URL: 'sensitive-connection' });
    } catch (error) {
      expect(String(error)).not.toContain('sensitive-connection');
    }
  });
  it('rejects shared secrets and overly long access sessions', () => {
    const config = valid();
    expect(() =>
      validateEnvironment({
        ...config,
        JWT_REFRESH_SECRET: config.JWT_ACCESS_SECRET,
      }),
    ).toThrow('JWT_REFRESH_SECRET');
    expect(() =>
      validateEnvironment({ ...config, JWT_ACCESS_EXPIRES_IN: '1d' }),
    ).toThrow('JWT_ACCESS_EXPIRES_IN');
    expect(() =>
      validateEnvironment({ ...config, JWT_REFRESH_EXPIRES_IN: '0d' }),
    ).toThrow('JWT_REFRESH_EXPIRES_IN');
  });
});

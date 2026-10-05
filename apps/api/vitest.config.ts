import { defineConfig } from 'vitest/config';
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    maxWorkers: 2,
    globals: true,
    include: ['src/**/*.spec.ts'],
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});

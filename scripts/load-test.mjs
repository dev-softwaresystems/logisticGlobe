import { writeFile, mkdir } from 'node:fs/promises';
const base = process.env.LOAD_API_URL ?? 'http://localhost:3000/api/v1';
const token = process.env.LOAD_ACCESS_TOKEN;
const seconds = Number(process.env.LOAD_SECONDS ?? 60),
  concurrency = Number(process.env.LOAD_CONCURRENCY ?? 5);
if (!token)
  throw new Error(
    'LOAD_ACCESS_TOKEN is required; provide a test session token in the environment',
  );
if (
  !Number.isInteger(seconds) ||
  seconds < 10 ||
  seconds > 3600 ||
  !Number.isInteger(concurrency) ||
  concurrency < 1 ||
  concurrency > 100
)
  throw new Error('Invalid load duration or concurrency');
const interval = Number(process.env.LOAD_REQUEST_INTERVAL_MS ?? 1000);
if (!Number.isInteger(interval) || interval < 0 || interval > 60000)
  throw new Error('Invalid request interval');
const origin = new URL(base);
if (
  origin.protocol !== 'https:' &&
  !(
    origin.protocol === 'http:' &&
    ['localhost', '127.0.0.1'].includes(origin.hostname)
  )
)
  throw new Error('Use HTTPS outside loopback');
const deadline = performance.now() + seconds * 1000;
const latencies = [];
const statuses = {};
let completed = 0,
  failures = 0;
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (performance.now() < deadline) {
      const started = performance.now();
      try {
        const response = await fetch(
          base.replace(/\/$/, '') + '/dashboard/summary',
          {
            headers: { authorization: 'Bearer ' + token },
            signal: AbortSignal.timeout(10000),
            redirect: 'error',
          },
        );
        await response.arrayBuffer();
        statuses[response.status] = (statuses[response.status] ?? 0) + 1;
        if (!response.ok) failures++;
      } catch {
        failures++;
        statuses.network = (statuses.network ?? 0) + 1;
      }
      completed++;
      if (latencies.length < 100000)
        latencies.push(performance.now() - started);
      const pause = Math.min(
        Math.max(0, interval - (performance.now() - started)),
        Math.max(0, deadline - performance.now()),
      );
      if (pause) await new Promise((resolve) => setTimeout(resolve, pause));
    }
  }),
);
latencies.sort((a, b) => a - b);
const percentile = (fraction) =>
  Math.round(
    (latencies[
      Math.min(latencies.length - 1, Math.floor(latencies.length * fraction))
    ] ?? 0) * 100,
  ) / 100;
const report = {
  testedAt: new Date().toISOString(),
  seconds,
  concurrency,
  requestIntervalMs: interval,
  completed,
  failures,
  statuses,
  latencyMs: {
    p50: percentile(0.5),
    p95: percentile(0.95),
    p99: percentile(0.99),
  },
  scope: 'Dashboard HTTP; not a routing or availability benchmark',
  sampleLimit: 100000,
};
await mkdir('artifacts', { recursive: true });
await writeFile(
  'artifacts/load-verification.json',
  JSON.stringify(report, null, 2) + '\n',
);
console.log(JSON.stringify(report, null, 2));
if (failures) process.exitCode = 1;

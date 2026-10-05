import { createInterface } from 'node:readline';
const endpoint = process.env.GPS_API_URL;
const token = process.env.GPS_API_TOKEN;
if (!endpoint || !token)
  throw new Error('GPS_API_URL and GPS_API_TOKEN are required');
const url = new URL(endpoint);
if (
  url.protocol !== 'https:' &&
  !(
    url.protocol === 'http:' &&
    ['localhost', '127.0.0.1'].includes(url.hostname)
  )
)
  throw new Error('HTTPS is required outside loopback');
if (url.username || url.password)
  throw new Error('Use environment variables for authentication');
const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
let sent = 0;
for await (const line of lines) {
  if (!line.trim()) continue;
  let payload;
  try {
    payload = JSON.parse(line);
  } catch {
    throw new Error('Invalid NDJSON observation');
  }
  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof payload.id !== 'string' ||
    typeof payload.vehicleId !== 'string'
  )
    throw new Error('Observations require UUID id and vehicleId');
  let accepted = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer ' + token,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
        redirect: 'error',
      });
      if (response.ok) {
        accepted = true;
        break;
      }
      if (response.status < 500 && response.status !== 429)
        throw new Error('Observation rejected with HTTP ' + response.status);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith('Observation rejected')
      )
        throw error;
    }
    if (attempt < 2)
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
  }
  if (!accepted)
    throw new Error(
      'Delivery failed after bounded retries; replay the same observation UUID',
    );
  sent++;
}
console.log(JSON.stringify({ accepted: sent }));

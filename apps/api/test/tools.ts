import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const taskRoot = fileURLToPath(new URL('../../../', import.meta.url));
export async function exerciseTool(
  name: string,
  env: Record<string, string>,
  input?: string,
): Promise<string> {
  const child: ChildProcessWithoutNullStreams = spawn(
    process.execPath,
    [resolve(taskRoot, 'scripts', name)],
    {
      cwd: taskRoot,
      env: { ...process.env, ...env },
      stdio: 'pipe',
      shell: false,
    },
  );
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += String(chunk);
  });
  child.stderr.resume();
  const completed = new Promise<string>((yes, no) => {
    child.once('error', no);
    child.once('close', (code) =>
      code === 0
        ? yes(output)
        : no(new Error('Operations tool failed: ' + name)),
    );
  });
  child.stdin.end(input);
  return completed;
}
export async function readLoadEvidence() {
  return JSON.parse(
    await readFile(
      resolve(taskRoot, 'artifacts/load-verification.json'),
      'utf8',
    ),
  ) as {
    completed: number;
    failures: number;
    statuses: Record<string, number>;
  };
}

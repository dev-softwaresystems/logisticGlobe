import { spawn } from 'node:child_process';
import { resolve, relative } from 'node:path';
const path = process.env.RECOVERY_BACKUP_DIRECTORY;
if (
  !path ||
  relative(resolve('artifacts/backups'), resolve(path)).startsWith('..')
)
  throw Error('Only isolated local backup');
const child = spawn(
  process.execPath,
  [resolve('scripts/restore-verify.mjs'), path],
  { stdio: 'inherit', shell: false },
);
child.on('close', (code) => {
  process.exitCode = code ?? 1;
});

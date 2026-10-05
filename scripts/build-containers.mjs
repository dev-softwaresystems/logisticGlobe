import { spawn } from 'node:child_process';
for (const service of ['api', 'web']) {
  const child = spawn(
    'docker',
    [
      'compose',
      '-f',
      'docker-compose.yml',
      '-f',
      'docker-compose.application.yml',
      'build',
      service,
    ],
    { stdio: 'inherit', shell: false },
  );
  const code = await new Promise((yes, no) => {
    child.once('error', no);
    child.once('close', (code) => yes(code ?? 1));
  });
  if (code) {
    process.exitCode = code;
    break;
  }
}

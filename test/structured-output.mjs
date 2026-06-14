import { spawn } from 'node:child_process';
import exercises from '../public/exercises.json' with { type: 'json' };

function waitForServer(proc) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server timeout')), 5000);
    proc.stdout.on('data', chunk => {
      const text = chunk.toString();
      if (text.includes('C Code Lab pronto')) {
        clearTimeout(timer);
        resolve();
      }
    });
    proc.stderr.on('data', chunk => process.stderr.write(chunk));
    proc.on('exit', code => reject(new Error(`server exited early: ${code}`)));
  });
}

const server = spawn('bun', ['server.js'], {
  cwd: new URL('..', import.meta.url),
  env: { ...process.env, PORT: '5191', MAX_CONCURRENT_RUNS: '2', MAX_QUEUE: '100' }
});

try {
  await waitForServer(server);
  const tester = exercises[0].tester.replace(
    '    if (clab_passed == 0 && clab_failed == 0) {',
    '    printf("debug dello studente\\n");\n    TEST_INT("somma base", somma(2, 3), 5);\n    TEST_INT("fallimento leggibile", somma(2, 2), 5);\n\n    if (clab_passed == 0 && clab_failed == 0) {'
  );
  const payload = {
    solution: '#include "aux.h"\nint somma(int a, int b) { return a + b; }\nint noise(int unused) { return 1; }\n',
    auxH: '#pragma once\nint somma(int, int);\nint noise(int);\n',
    auxC: '#include "aux.h"\n',
    tester,
    stdin: ''
  };
  const json = await (await fetch('http://localhost:5191/api/run', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  })).json();

  if (json.ok || json.run?.code !== 1) throw new Error(`expected failing structured run: ${JSON.stringify(json)}`);
  if (!json.run.stdout.includes('__CLAB_SUMMARY__|1|1')) throw new Error(`missing summary: ${json.run.stdout}`);
  if (!json.run.stdout.includes('__CLAB_FAIL__|fallimento leggibile|5|4')) throw new Error(`missing failed detail: ${json.run.stdout}`);
  if (json.compile.stderr.includes('unused parameter')) throw new Error(`unused warning leaked: ${json.compile.stderr}`);
  console.log('structured output ok: summary/fail detail/warning cleanup');
} finally {
  server.kill('SIGTERM');
}

import { spawn } from 'node:child_process';

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
  env: { ...process.env, PORT: '5188', MAX_CONCURRENT_RUNS: '2', MAX_QUEUE: '100' }
});
try {
  await waitForServer(server);
  const payload = {
    solution: '#include "aux.h"\nint somma_array(const int *v, int n){int s=0; for(int i=0;i<n;i++) s+=v[i]; return s;}\n',
    auxH: '#ifndef AUX_H\n#define AUX_H\nint somma_array(const int *v, int n);\n#endif\n',
    auxC: '#include "aux.h"\n',
    tester: '#include <assert.h>\n#include <stdio.h>\n#include "aux.h"\nint main(void){int a[]={1,2,3}; assert(somma_array(a,3)==6); puts("pass");}\n',
    stdin: ''
  };
  const health = await (await fetch('http://localhost:5188/api/health')).json();
  if (!health.ok || health.maxConcurrentRuns !== 2) throw new Error(`bad health: ${JSON.stringify(health)}`);

  const responses = await Promise.all(Array.from({ length: 12 }, () =>
    fetch('http://localhost:5188/api/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json())
  ));
  const bad = responses.find(json => !json.ok || !json.run.stdout.includes('pass') || !json.queue);
  if (bad) {
    console.error(JSON.stringify(bad, null, 2));
    process.exitCode = 1;
  } else {
    console.log('smoke ok:', responses.length, 'run concorrenti accodate; maxConcurrentRuns=', health.maxConcurrentRuns);
  }
} finally {
  server.kill('SIGTERM');
}

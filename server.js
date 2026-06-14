import http from 'node:http';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const PORT = Number(process.env.PORT || 5177);
const ROOT = resolve(import.meta.dirname, 'public');
const MAX_BYTES = Number(process.env.MAX_BYTES || 220_000);

// Per 200-400 persone: non lanciare 400 clang insieme.
// Tieni poche compilazioni concorrenti e metti le altre in coda/backpressure.
const MAX_CONCURRENT_RUNS = Number(process.env.MAX_CONCURRENT_RUNS || 4);
const MAX_QUEUE = Number(process.env.MAX_QUEUE || 500);
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 30_000);

let activeRuns = 0;
let completedRuns = 0;
const queue = [];

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
]);

function send(res, status, body, type = 'application/json; charset=utf-8', extraHeaders = {}) {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', ...extraHeaders });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function bodyJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.byteLength;
    if (size > MAX_BYTES) throw Object.assign(new Error('Payload troppo grande'), { status: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function enqueue(task) {
  if (queue.length >= MAX_QUEUE) {
    const err = new Error('Server pieno: troppi test in coda, riprova tra poco.');
    err.status = 503;
    err.retryAfter = 3;
    throw err;
  }
  const enqueuedAt = Date.now();
  return new Promise((resolveTask, rejectTask) => {
    queue.push({ task, resolveTask, rejectTask, enqueuedAt });
    drainQueue();
  });
}

function drainQueue() {
  while (activeRuns < MAX_CONCURRENT_RUNS && queue.length > 0) {
    const job = queue.shift();
    activeRuns++;
    Promise.resolve()
      .then(job.task)
      .then(result => job.resolveTask({ ...result, queue: { waitMs: Date.now() - job.enqueuedAt, activeRuns, pending: queue.length } }))
      .catch(job.rejectTask)
      .finally(() => {
        activeRuns--;
        completedRuns++;
        drainQueue();
      });
  }
}

function run(cmd, args, opts = {}) {
  return new Promise((resolveRun) => {
    const started = Date.now();
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ASAN_OPTIONS: 'detect_leaks=0:halt_on_error=1', UBSAN_OPTIONS: 'halt_on_error=1' },
    });
    let stdout = '';
    let stderr = '';
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGKILL');
    }, opts.timeoutMs ?? 5000);
    child.stdout.on('data', d => { stdout += d.toString(); if (stdout.length > 100_000) child.kill('SIGKILL'); });
    child.stderr.on('data', d => { stderr += d.toString(); if (stderr.length > 100_000) child.kill('SIGKILL'); });
    child.on('error', err => {
      clearTimeout(timer);
      resolveRun({ code: 127, stdout, stderr: `${stderr}\n${err.message}`.trim(), ms: Date.now() - started, timeout: false });
    });
    child.on('close', code => {
      clearTimeout(timer);
      resolveRun({ code, stdout, stderr: killed ? `${stderr}\n[TIMEOUT] processo fermato dopo ${opts.timeoutMs ?? 5000}ms`.trim() : stderr, ms: Date.now() - started, timeout: killed });
    });
    if (opts.stdin) child.stdin.write(opts.stdin);
    child.stdin.end();
  });
}

function compilerCommand() {
  if (process.env.CC) return process.env.CC;
  // `bun` mette node_modules/.bin davanti al PATH: dopo aver aggiunto clang-wasm,
  // su macOS arm64 quel binario wrapper non funziona. Preferisci il clang di sistema.
  if (process.platform === 'darwin' && existsSync('/usr/bin/clang')) return '/usr/bin/clang';
  return 'clang';
}

async function compileAndRun(input) {
  const dir = await mkdtemp(join(tmpdir(), 'c-code-lab-'));
  try {
    const files = {
      'solution.c': String(input.solution ?? ''),
      'aux.h': String(input.auxH ?? ''),
      'aux.c': String(input.auxC ?? ''),
      'tester.c': String(input.tester ?? ''),
    };
    if (!files['solution.c'].trim()) return { ok: false, stage: 'validate', compile: null, run: null, error: 'solution.c è vuoto' };
    if (!files['tester.c'].trim() && !/\bmain\s*\(/.test(files['solution.c'])) {
      return { ok: false, stage: 'validate', compile: null, run: null, error: 'Serve un tester.c con main(), oppure metti main() in solution.c.' };
    }
    await Promise.all(Object.entries(files).map(([name, content]) => writeFile(join(dir, name), content)));

    const sources = [];
    if (files['tester.c'].trim()) sources.push('tester.c');
    sources.push('solution.c');
    if (files['aux.c'].trim()) sources.push('aux.c');

    const args = [
      '-std=c17', '-Wall', '-Wextra', '-Wpedantic',
      // Meno rumore sui template/TODO: teniamo gli avvisi utili, togliamo quelli da stub vuoti.
      '-Wno-unused-parameter', '-Wno-unused-variable', '-Wno-unused-function',
      '-Wno-strict-prototypes', '-Wno-uninitialized',
      '-g', '-fsanitize=address,undefined', ...sources, '-o', 'program'
    ];
    const compile = await run(compilerCommand(), args, { cwd: dir, timeoutMs: 8000 });
    if (compile.code !== 0) return { ok: false, stage: 'compile', compile, run: null };
    const exec = await run(join(dir, 'program'), [], { cwd: dir, stdin: String(input.stdin ?? ''), timeoutMs: 4000 });
    return { ok: exec.code === 0, stage: 'run', compile, run: exec };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function staticFile(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const raw = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const path = normalize(raw).replace(/^\.\.(\/|$)/, '');
  const abs = resolve(ROOT, `.${path}`);
  if (!abs.startsWith(ROOT) || !existsSync(abs)) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  const data = await readFile(abs);
  send(res, 200, data, mime.get(extname(abs)) ?? 'application/octet-stream');
}

const server = http.createServer(async (req, res) => {
  req.setTimeout(REQUEST_TIMEOUT_MS);
  try {
    if (req.method === 'GET' && req.url === '/api/health') {
      return send(res, 200, { ok: true, activeRuns, pendingRuns: queue.length, completedRuns, maxConcurrentRuns: MAX_CONCURRENT_RUNS, maxQueue: MAX_QUEUE });
    }
    if (req.method === 'POST' && req.url === '/api/run') {
      const input = await bodyJson(req);
      const result = await enqueue(() => compileAndRun(input));
      return send(res, 200, result);
    }
    if (req.method === 'GET') return staticFile(req, res);
    send(res, 405, { error: 'method not allowed' });
  } catch (err) {
    send(res, err.status ?? 500, { error: err.message ?? String(err) }, 'application/json; charset=utf-8', err.retryAfter ? { 'retry-after': String(err.retryAfter) } : {});
  }
});

server.listen(PORT, () => console.log(`C Code Lab pronto: http://localhost:${PORT} | concurrency=${MAX_CONCURRENT_RUNS} queue=${MAX_QUEUE}`));

import { mkdtemp, writeFile, rm, cp, chmod } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const MAX_BYTES = Number(process.env.MAX_BYTES || 220_000);
const API_DIR = dirname(fileURLToPath(import.meta.url));
function optionalPatchelfBinDir() {
  try {
    // Direct resolve so Vercel bundles this optional binary package into the function.
    return dirname(require.resolve('@xspect-build/patchelf-linux-x64/bin/patchelf'));
  } catch {
    return '';
  }
}
const PATCHELF_BIN_PATH = [
  optionalPatchelfBinDir(),
  join(API_DIR, '..', 'node_modules', '@xspect-build', 'patchelf-linux-x64', 'bin'),
  join(process.cwd(), 'node_modules', '@xspect-build', 'patchelf-linux-x64', 'bin'),
].filter(Boolean).join(':');

function run(cmd, args, opts = {}) {
  return new Promise((resolveRun) => {
    const started = Date.now();
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PATH: `${PATCHELF_BIN_PATH}:${process.env.PATH || ''}`,
        ASAN_OPTIONS: 'detect_leaks=0:halt_on_error=1',
        UBSAN_OPTIONS: 'halt_on_error=1',
      },
    });
    let stdout = '', stderr = '', killed = false;
    const timer = setTimeout(() => { killed = true; child.kill('SIGKILL'); }, opts.timeoutMs ?? 5000);
    child.stdout.on('data', d => { stdout += d.toString(); if (stdout.length > 100_000) child.kill('SIGKILL'); });
    child.stderr.on('data', d => { stderr += d.toString(); if (stderr.length > 100_000) child.kill('SIGKILL'); });
    child.on('error', err => { clearTimeout(timer); resolveRun({ code: 127, stdout, stderr: `${stderr}\n${err.message}`.trim(), ms: Date.now() - started, timeout: false }); });
    child.on('close', code => { clearTimeout(timer); resolveRun({ code, stdout, stderr: killed ? `${stderr}\n[TIMEOUT] processo fermato`.trim() : stderr, ms: Date.now() - started, timeout: killed }); });
    if (opts.stdin) child.stdin.write(opts.stdin);
    child.stdin.end();
  });
}

async function compilerCommand(workDir) {
  if (process.env.CC) return { cmd: process.env.CC, argsPrefix: [] };
  // Vercel/Linux: portiamo clang come dipendenza npm (`clang-wasm`),
  // così non dipendiamo dal compilatore preinstallato nell'immagine serverless.
  if (process.platform === 'linux' && process.arch === 'x64') {
    try {
      const src = dirname(require.resolve('clang-linux-x64/package.json'));
      const dst = join(workDir, 'clang-linux-x64');
      await cp(src, dst, { recursive: true });
      await Promise.all(['clang', 'clang-real', 'wasm-ld'].map(name => chmod(join(dst, name), 0o755).catch(() => {})));
      return { cmd: join(dst, 'clang'), argsPrefix: [] };
    } catch {
      try {
        return { cmd: require('clang-wasm').getBinaryPath('clang'), argsPrefix: [] };
      } catch {
        // fallback sotto
      }
    }
  }
  return { cmd: 'clang', argsPrefix: [] };
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
    if (!files['solution.c'].trim()) return { ok: false, stage: 'validate', error: 'solution.c è vuoto' };
    if (!files['tester.c'].trim() && !/\bmain\s*\(/.test(files['solution.c'])) return { ok: false, stage: 'validate', error: 'Serve tester.c con main(), oppure main() in solution.c.' };
    await Promise.all(Object.entries(files).map(([name, content]) => writeFile(join(dir, name), content)));
    const sources = [];
    if (files['tester.c'].trim()) sources.push('tester.c');
    sources.push('solution.c');
    if (files['aux.c'].trim()) sources.push('aux.c');
    const cc = await compilerCommand(dir);
    const compile = await run(cc.cmd, [
      ...cc.argsPrefix,
      '-std=c17','-Wall','-Wextra','-Wpedantic',
      '-Wno-unused-parameter','-Wno-unused-variable','-Wno-unused-function',
      '-Wno-strict-prototypes','-Wno-uninitialized',
      '-g','-fsanitize=address,undefined',...sources,'-o','program'
    ], { cwd: dir, timeoutMs: 8000 });
    if (compile.code !== 0) return { ok: false, stage: 'compile', compile, run: null };
    const exec = await run(join(dir, 'program'), [], { cwd: dir, stdin: String(input.stdin ?? ''), timeoutMs: 4000 });
    return { ok: exec.code === 0, stage: 'run', compile, run: exec };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  const raw = JSON.stringify(req.body ?? {});
  if (raw.length > MAX_BYTES) return res.status(413).json({ error: 'Payload troppo grande' });

  if (process.env.RUNNER_URL) {
    const r = await fetch(`${process.env.RUNNER_URL.replace(/\/$/, '')}/api/run`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: raw
    });
    res.status(r.status).json(await r.json());
    return;
  }

  try {
    res.status(200).json(await compileAndRun(req.body ?? {}));
  } catch (err) {
    res.status(500).json({ ok: false, stage: 'server', error: err.message ?? String(err) });
  }
}

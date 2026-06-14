const DEFAULT_TESTER = `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include "aux.h"

#if defined(__GNUC__)
#define CLAB_UNUSED __attribute__((unused))
#else
#define CLAB_UNUSED
#endif

static int clab_passed = 0;
static int clab_failed = 0;

static CLAB_UNUSED void clab_print_escaped(const char *s) {
    if (s == NULL) { printf("(null)"); return; }
    for (; *s; s++) {
        if (*s == '\n') printf("\\n");
        else if (*s == '\r') printf("\\r");
        else if (*s == '|') printf("\\\\|");
        else if (*s == '\\') printf("\\\\");
        else putchar(*s);
    }
}

static CLAB_UNUSED void clab_pass(const char *name) {
    clab_passed++;
    printf("__CLAB_PASS__|");
    clab_print_escaped(name);
    printf("\n");
}

static CLAB_UNUSED void clab_fail(const char *name, const char *expected, const char *actual) {
    clab_failed++;
    printf("__CLAB_FAIL__|");
    clab_print_escaped(name);
    printf("|");
    clab_print_escaped(expected);
    printf("|");
    clab_print_escaped(actual);
    printf("\n");
}

#define TEST_TRUE(name, cond) do { \
    if (cond) clab_pass(name); \
    else clab_fail(name, "true", "false"); \
} while (0)

#define TEST_INT(name, actual, expected) do { \
    long long clab_a = (long long)(actual); \
    long long clab_e = (long long)(expected); \
    char clab_as[64], clab_es[64]; \
    snprintf(clab_as, sizeof clab_as, "%lld", clab_a); \
    snprintf(clab_es, sizeof clab_es, "%lld", clab_e); \
    if (clab_a == clab_e) clab_pass(name); \
    else clab_fail(name, clab_es, clab_as); \
} while (0)

#define TEST_DOUBLE(name, actual, expected, eps) do { \
    double clab_a = (double)(actual); \
    double clab_e = (double)(expected); \
    char clab_as[96], clab_es[96]; \
    snprintf(clab_as, sizeof clab_as, "%.12g", clab_a); \
    snprintf(clab_es, sizeof clab_es, "%.12g", clab_e); \
    if (fabs(clab_a - clab_e) <= (eps)) clab_pass(name); \
    else clab_fail(name, clab_es, clab_as); \
} while (0)

#define TEST_STR(name, actual, expected) do { \
    const char *clab_a = (actual); \
    const char *clab_e = (expected); \
    int clab_ok = (clab_a == NULL && clab_e == NULL) || \
                  (clab_a != NULL && clab_e != NULL && strcmp(clab_a, clab_e) == 0); \
    if (clab_ok) clab_pass(name); \
    else clab_fail(name, clab_e, clab_a); \
} while (0)

int main(void) {
    /*
      Scrivi qui i test. Esempi:

      TEST_INT("caso base", mia_funzione(2, 3), 5);
      TEST_TRUE("proprietà", condizione_da_verificare);
      TEST_DOUBLE("media", media(...), 3.5, 1e-6);
      TEST_STR("stringa", funzione(...), "atteso");

      Se fai printf nella soluzione, compariranno sotto "Print del programma".
    */

    if (clab_passed == 0 && clab_failed == 0) {
        clab_fail("tester.c", "almeno un TEST_*", "0 test scritti");
    }
    printf("__CLAB_SUMMARY__|%d|%d\n", clab_passed, clab_failed);
    return clab_failed ? 1 : 0;
}
`;

const free = {
  id: 'free', year: 'free', exam: 'Libero', label: 'Scratch', title: 'Esercizio libero',
  openQuestion: '', sourceUrl: '', statementHtml: '',
  solution: `#include "aux.h"\n\nint somma_array(const int *v, int n) {\n    int s = 0;\n    for (int i = 0; i < n; i++) s += v[i];\n    return s;\n}\n`,
  auxH: `#ifndef AUX_H\n#define AUX_H\n\nint somma_array(const int *v, int n);\n\n#endif\n`,
  auxC: `#include "aux.h"\n`,
  tester: DEFAULT_TESTER,
  stdin: ''
};

let exercises = [free];
let current = free;
const DATA_VERSION = 'diag-payloads-2024-2026-v11';
const ids = ['solution', 'auxH', 'auxC', 'tester', 'stdin'];
const $ = id => document.getElementById(id);
const PREFS_KEY = 'c-code-lab:prefs';

function loadPrefs() {
  try {
    return { autosave: true, theme: 'dark', ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') };
  } catch {
    return { autosave: true, theme: 'dark' };
  }
}

function savePrefs(prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

function applyTheme(theme) {
  const next = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
}

function setupPrefs() {
  const prefs = loadPrefs();
  applyTheme(prefs.theme);
  $('autosaveToggle').checked = prefs.autosave !== false;
  $('themeSelect').value = prefs.theme === 'light' ? 'light' : 'dark';

  $('autosaveToggle').addEventListener('change', () => {
    const next = { ...loadPrefs(), autosave: $('autosaveToggle').checked };
    savePrefs(next);
    $('status').textContent = next.autosave ? 'autosave on' : 'autosave off';
    $('status').className = '';
  });

  $('themeSelect').addEventListener('change', () => {
    const next = { ...loadPrefs(), theme: $('themeSelect').value };
    savePrefs(next);
    applyTheme(next.theme);
  });
}

function saveKey(ex = current) { return `c-code-lab:${ex.id}`; }
function snapshot() { return { ...Object.fromEntries(ids.map(id => [id, $(id).value])), __dataVersion: DATA_VERSION }; }
function setEditors(data) {
  const safe = { ...data };
  if (!hasUsableTester(safe.tester)) safe.tester = current?.tester || DEFAULT_TESTER;
  ids.forEach(id => $(id).value = safe[id] ?? '');
  updateHighlights();
}
function showPane(id = 'auxH') {
  document.querySelectorAll('[data-pane]').forEach(b => b.classList.toggle('active', b.dataset.pane === id));
  document.querySelectorAll('[data-editor-wrap]').forEach(p => {
    if (p.classList.contains('pane')) p.classList.toggle('active', p.dataset.editorWrap === id);
  });
  syncHighlightScroll(id);
}
function isLegacyTester(tester) {
  const text = String(tester ?? '');
  return text.includes('Aggiungi test con assert') && text.includes('tester pronto');
}
function stripCComments(text) {
  return String(text ?? '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}
function hasRealTestCall(tester) {
  const clean = stripCComments(tester)
    .split('\n')
    .filter(line => !/^\s*#\s*define\s+TEST_/.test(line))
    .join('\n');
  const main = clean.match(/\bint\s+main\s*\([^)]*\)\s*\{([\s\S]*)\}\s*$/)?.[1] ?? clean;
  // Il template vuoto contiene un clab_fail fallback se nessun test gira: non contar quello.
  const withoutEmptyFallback = main.replace(/if\s*\(\s*clab_passed\s*==\s*0[\s\S]*?\}\s*/g, '');
  return /\bTEST_(TRUE|INT|DOUBLE|STR)\s*\(|\btest_[A-Za-z0-9_]*\s*\(|\bclab_pass\s*\(|\bclab_fail\s*\(/.test(withoutEmptyFallback);
}
function hasUsableTester(tester) {
  const text = String(tester ?? '');
  if (!text.trim() || isLegacyTester(text)) return false;
  return !text.includes('__CLAB_SUMMARY__') || hasRealTestCall(text);
}

function highlightC(text) {
  const keywords = new Set('auto break case continue default do else enum extern for goto if register return sizeof static struct switch typedef union volatile while const inline restrict signed unsigned'.split(' '));
  const types = new Set('void char short int long float double bool _Bool size_t FILE Mat TipoLista TipoNodo TipoAlbero TipoNodoAlbero TipoInfoAlbero T TArray'.split(' '));
  const constants = new Set('NULL true false stdin stdout stderr'.split(' '));
  const tokenRe = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|^[ \t]*#[^\n]*|\b0[xX][0-9a-fA-F]+[uUlL]*\b|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?[uUlLfF]*\b|\b[A-Za-z_]\w*\b/gm;
  let out = '';
  let last = 0;
  String(text ?? '').replace(tokenRe, (match, offset) => {
    out += escapeHtml(text.slice(last, offset));
    let cls = '';
    if (match.startsWith('/*') || match.startsWith('//')) cls = 'comment';
    else if (match.startsWith('"')) cls = 'string';
    else if (match.startsWith("'")) cls = 'char';
    else if (/^\s*#/.test(match)) cls = 'pre';
    else if (/^\d|^0[xX]/.test(match)) cls = 'number';
    else if (keywords.has(match)) cls = 'keyword';
    else if (types.has(match)) cls = 'type';
    else if (constants.has(match)) cls = 'constant';
    const token = escapeHtml(match);
    out += cls ? `<span class="tok-${cls}">${token}</span>` : token;
    last = offset + match.length;
    return match;
  });
  out += escapeHtml(String(text ?? '').slice(last));
  return out || ' ';
}

function highlightCode(id) {
  const pre = $(`${id}Highlight`);
  const textarea = $(id);
  if (!pre || !textarea) return;
  pre.innerHTML = id === 'stdin' ? escapeHtml(textarea.value || ' ') : highlightC(textarea.value || ' ');
  syncHighlightScroll(id);
}
function updateHighlights() { ids.forEach(highlightCode); }
function syncHighlightScroll(id) {
  const pre = $(`${id}Highlight`);
  const textarea = $(id);
  if (!pre || !textarea) return;
  pre.scrollTop = textarea.scrollTop;
  pre.scrollLeft = textarea.scrollLeft;
}
function setupHighlighting() {
  ids.forEach(id => {
    const textarea = $(id);
    if (!textarea) return;
    textarea.addEventListener('input', () => highlightCode(id));
    textarea.addEventListener('scroll', () => syncHighlightScroll(id));
  });
  updateHighlights();
}
function shouldAutosave() { return loadPrefs().autosave !== false; }
function persistSnapshot() {
  localStorage.setItem(saveKey(), JSON.stringify(snapshot()));
  localStorage.setItem('c-code-lab:last', current.id);
}
function autosave() {
  if (!shouldAutosave()) return;
  persistSnapshot();
}
function savedOrDefault(ex) {
  const saved = localStorage.getItem(saveKey(ex));
  if (!saved) return ex;
  const parsed = JSON.parse(saved);
  if (ex.id !== 'free' && parsed.__dataVersion !== DATA_VERSION) {
    // Cache vecchia: prima gli esercizi avevano placeholder per aux.h/aux.c.
    // Preservo soluzione/tester/stdin dello studente, ma riprendo aux ufficiali dal sito esami.
    return {
      ...ex,
      solution: parsed.solution && !parsed.solution.includes('Scrivi qui la soluzione') ? parsed.solution : ex.solution,
      // Nuova versione dati: aggiorna i tester generati; preserva solo tester custom non-protocollo.
      tester: hasUsableTester(parsed.tester) && !String(parsed.tester).includes('__CLAB_SUMMARY__') ? parsed.tester : ex.tester,
      stdin: parsed.stdin ?? ex.stdin,
      auxH: ex.auxH,
      auxC: ex.auxC,
    };
  }
  if (ex.id !== 'free') {
    return {
      ...ex,
      ...parsed,
      tester: hasUsableTester(parsed.tester) ? parsed.tester : ex.tester,
      auxH: parsed.__dataVersion === DATA_VERSION ? (parsed.auxH ?? ex.auxH) : ex.auxH,
      auxC: parsed.__dataVersion === DATA_VERSION ? (parsed.auxC ?? ex.auxC) : ex.auxC,
    };
  }
  return { ...ex, ...parsed, tester: hasUsableTester(parsed.tester) ? parsed.tester : ex.tester };
}

function renderStatement(ex) {
  $('problemTitle').textContent = ex.title;
  if (ex.statementHtml) {
    $('statement').innerHTML = normalizeStatementHtml(ex.statementHtml);
    return;
  }
  const open = ex.openQuestion ? `<p><strong>Domanda aperta dell’appello:</strong> ${escapeHtml(ex.openQuestion)}</p>` : '';
  const warning = ex.id === 'free' ?
    '<p>Area libera per test rapidi.</p>' :
    '<p class="warn">Traccia non caricata per questo esercizio.</p>';
  $('statement').innerHTML = open + warning;
}

function selectExercise(id) {
  current = exercises.find(e => e.id === id) || free;
  setEditors(savedOrDefault(current));
  showPane('auxH');
  renderStatement(current);
  renderList();
  $('output').textContent = 'Pronto.';
  $('status').textContent = 'idle';
  $('status').className = '';
}

function filteredExercises() {
  const year = $('year').value;
  return exercises.filter(e => year === 'all' || String(e.year) === year);
}

function renderList() {
  const list = filteredExercises();
  const shown = list.some(e => e.id === current.id) ? list : [current, ...list];
  $('exerciseSelect').innerHTML = shown.map(e => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.title)}</option>`).join('');
  $('exerciseSelect').value = current.id;
}

function renderYears() {
  const years = [...new Set(exercises.map(e => e.year).filter(y => y !== 'free'))].sort((a,b) => b-a);
  $('year').innerHTML = '<option value="all">Tutti gli anni</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
}

function moveExercise(delta) {
  const list = filteredExercises();
  if (!list.length) return;
  const idx = Math.max(0, list.findIndex(e => e.id === current.id));
  const next = list[(idx + delta + list.length) % list.length];
  selectExercise(next.id);
}

function splitProtocolFields(line) {
  const fields = [];
  let cur = '';
  let esc = false;
  for (const ch of line) {
    if (esc) {
      if (ch === 'n') cur += '\n';
      else if (ch === 'r') cur += '\r';
      else cur += ch;
      esc = false;
    } else if (ch === '\\') {
      esc = true;
    } else if (ch === '|') {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function parseTestProtocol(stdout = '') {
  const parsed = { hasProtocol: false, passed: [], failed: [], notes: [], programOutput: '' };
  const programLines = [];
  for (const line of String(stdout ?? '').split(/\r?\n/)) {
    if (!line) continue;
    if (line.startsWith('__CLAB_PASS__|')) {
      parsed.hasProtocol = true;
      parsed.passed.push({ name: splitProtocolFields(line).slice(1).join('|') || 'test senza nome' });
    } else if (line.startsWith('__CLAB_FAIL__|')) {
      parsed.hasProtocol = true;
      const [, name = 'test senza nome', expected = '', actual = ''] = splitProtocolFields(line);
      parsed.failed.push({ name, expected, actual });
    } else if (line.startsWith('__CLAB_SUMMARY__|')) {
      parsed.hasProtocol = true;
      const [, passed, failed] = splitProtocolFields(line);
      parsed.summary = { passed: Number(passed) || 0, failed: Number(failed) || 0 };
    } else if (line.startsWith('__CLAB_NOTE__|')) {
      parsed.hasProtocol = true;
      parsed.notes.push(splitProtocolFields(line).slice(1).join('|'));
    } else {
      programLines.push(line);
    }
  }
  parsed.programOutput = programLines.join('\n').trimEnd();
  parsed.passedCount = parsed.summary?.passed ?? parsed.passed.length;
  parsed.failedCount = parsed.summary?.failed ?? parsed.failed.length;
  return parsed;
}

function warningCount(text = '') {
  return (String(text).match(/\bwarning:/g) || []).length;
}

function indentBlock(text, prefix = '    ') {
  return String(text || '(vuoto)').split('\n').map(line => prefix + line).join('\n');
}

function format(result) {
  if (result.error) return `❌ ERRORE: ${result.error}`;

  const parts = [];
  const compile = result.compile;
  const run = result.run;
  const tests = parseTestProtocol(run?.stdout ?? '');

  if (compile && compile.code !== 0) {
    parts.push('❌ COMPILAZIONE FALLITA');
  } else if (tests.hasProtocol) {
    parts.push(`${tests.failedCount ? '❌' : '✅'} TEST: ${tests.passedCount} passati, ${tests.failedCount} falliti`);
  } else {
    parts.push(result.ok ? '✅ OK' : '❌ FAIL');
    if (run) parts.push('TEST: 0 passati, 0 falliti — tester non strutturato');
  }

  if (result.queue) parts.push(`coda: attesa ${result.queue.waitMs}ms, pending ${result.queue.pending}`);
  if (compile) parts.push(`compile: ${compile.code === 0 ? 'ok' : 'errore'} (${compile.ms}ms, exit ${compile.code})`);
  if (run) parts.push(`run: ${run.ms}ms, exit ${run.code}`);

  if (tests.notes.length) parts.push(`\nNote:\n${tests.notes.map(n => `- ${n}`).join('\n')}`);

  if (tests.failed.length) {
    parts.push('\n--- Test falliti ---');
    tests.failed.forEach((fail, i) => {
      parts.push(`${i + 1}. ${fail.name}`);
      parts.push('   Output mandato:');
      parts.push(indentBlock(fail.actual));
      parts.push('   Output atteso:');
      parts.push(indentBlock(fail.expected));
      if (tests.programOutput) {
        parts.push('   Print fatte:');
        parts.push(indentBlock(tests.programOutput));
      }
    });
  } else if (tests.hasProtocol && tests.programOutput) {
    parts.push(`\n--- Print del programma ---\n${tests.programOutput}`);
  } else if (!tests.hasProtocol && run?.stdout) {
    parts.push(`\n--- stdout ---\n${run.stdout.trimEnd()}`);
  }

  if (compile?.stderr) {
    const n = warningCount(compile.stderr);
    parts.push(`\n--- ${compile.code === 0 ? `Avvisi compile (${n})` : 'stderr compile'} ---`);
    parts.push(compile.stderr.trimEnd());
  }
  if (run?.stderr) parts.push(`\n--- stderr run ---\n${run.stderr.trimEnd()}`);

  return parts.join('\n');
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

function normalizeStatementHtml(html) {
  const doc = new DOMParser().parseFromString(String(html ?? ''), 'text/html');
  doc.querySelectorAll('listing').forEach(node => {
    const pre = doc.createElement('pre');
    pre.textContent = node.textContent;
    node.replaceWith(pre);
  });
  doc.querySelectorAll('code > pre').forEach(pre => {
    const code = pre.parentElement;
    code.replaceWith(pre);
  });
  doc.querySelectorAll('pre').forEach(pre => {
    pre.textContent = pre.textContent.replace(/^\n+|\n+$/g, '');
  });
  doc.querySelectorAll('li').forEach(li => {
    if (li.parentElement && !['UL', 'OL'].includes(li.parentElement.tagName)) {
      const ul = doc.createElement('ul');
      li.replaceWith(ul);
      ul.appendChild(li);
    }
  });
  return doc.body.innerHTML;
}

function buildClientC(data) {
  let code = [data.auxH, data.auxC, data.solution, data.tester].join('\n\n');
  // Picoc non gestisce direttive non standard e macro multi-linea come un preprocessore C completo.
  code = code.replace(/^\s*#\s*pragma\s+once\s*$/gm, '');
  code = code.replace(/\\\r?\n/g, ' ');
  // Nel browser Picoc non ha filesystem: aux.h viene concatenato sopra.
  code = code.replace(/^\s*#\s*include\s+"aux\.h"\s*$/gm, '');
  // Picoc non include assert.h: trasformiamo assert(expr) in controllo runtime semplice.
  code = code.replace(/^\s*#\s*include\s+<assert\.h>\s*$/gm, '');
  code = code.replace(/assert\s*\(([^;]+)\)\s*;/g, 'if (!($1)) { printf("Assertion failed: $1\\n"); return 1; }');
  return code;
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function setupResizablePanels() {
  const main = document.getElementById('mainLayout');
  const work = document.getElementById('workPanel');
  const saved = JSON.parse(localStorage.getItem('c-code-lab:layout') || '{}');
  if (saved.problemWidth) main.style.setProperty('--problem-width', saved.problemWidth);
  if (saved.editorWidth) work.style.setProperty('--editor-width', saved.editorWidth);
  if (saved.outputHeight) work.style.setProperty('--output-height', saved.outputHeight);

  const persist = () => localStorage.setItem('c-code-lab:layout', JSON.stringify({
    problemWidth: main.style.getPropertyValue('--problem-width'),
    editorWidth: work.style.getPropertyValue('--editor-width'),
    outputHeight: work.style.getPropertyValue('--output-height'),
  }));

  document.querySelectorAll('[data-resizer]').forEach(handle => {
    handle.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      handle.setPointerCapture(event.pointerId);
      handle.classList.add('dragging');
      const kind = handle.dataset.resizer;
      const startX = event.clientX;
      const startY = event.clientY;
      const mainRect = main.getBoundingClientRect();
      const workRect = work.getBoundingClientRect();
      const startProblem = document.querySelector('.problem-panel').getBoundingClientRect().width;
      const startEditor = document.querySelector('.solution').getBoundingClientRect().width;
      const startOutput = document.querySelector('.output-card').getBoundingClientRect().height;
      document.body.classList.add(kind === 'output' ? 'resizing-y' : 'resizing');

      const onMove = (move) => {
        if (kind === 'main') {
          const width = clamp(startProblem + move.clientX - startX, 300, mainRect.width - 520);
          main.style.setProperty('--problem-width', `${Math.round(width)}px`);
        } else if (kind === 'editor') {
          const width = clamp(startEditor + move.clientX - startX, 300, workRect.width - 280);
          work.style.setProperty('--editor-width', `${Math.round(width)}px`);
        } else if (kind === 'output') {
          const height = clamp(startOutput - (move.clientY - startY), 130, workRect.height - 260);
          work.style.setProperty('--output-height', `${Math.round(height)}px`);
        }
      };
      const onUp = () => {
        handle.classList.remove('dragging');
        document.body.classList.remove('resizing', 'resizing-y');
        persist();
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp, { once: true });
    });
  });
}

function runInBrowser(data) {
  return new Promise((resolve) => {
    if (!window.picocjs?.runC) return resolve({ ok: false, error: 'Runner browser non caricato' });
    if (!hasRealTestCall(data.tester)) {
      return resolve({ ok: false, error: 'Tester mancante per questo esercizio: ci sono solo macro/helper, nessun TEST_* reale.' });
    }
    if (/\bscanf\s*\(/.test([data.solution, data.tester, data.auxC].join('\n'))) {
      return resolve({ ok: false, error: 'scanf/input non supportato dal runner browser.' });
    }
    const started = performance.now();
    let stdout = '';
    let settled = false;
    const finish = (ok, error = '') => {
      if (settled) return;
      settled = true;
      resolve({ ok, stage: 'browser', compile: { code: 0, stdout: '', stderr: '', ms: 0 }, run: { code: ok ? 0 : 1, stdout, stderr: error, ms: Math.round(performance.now() - started) } });
    };
    try {
      window.picocjs.runC(buildClientC(data), chunk => { stdout += String(chunk ?? ''); });
      setTimeout(() => {
        const protocol = parseTestProtocol(stdout);
        const runtimeError = /Assertion failed|can't read file|parse error|error/i.test(stdout);
        const failedTests = protocol.hasProtocol && protocol.failedCount > 0;
        finish(!runtimeError && !failedTests, runtimeError ? stdout : '');
      }, 80);
    } catch (err) {
      finish(false, err.message ?? String(err));
    }
  });
}

async function runOnServer(data) {
  const res = await fetch('/api/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
  return res.json();
}

async function run(mode) {
  $('status').textContent = mode === 'browser' ? 'browser...' : 'server...';
  $('status').className = '';
  $('output').textContent = mode === 'browser' ? 'Eseguo nel browser...' : 'Compilo su server...';
  autosave();
  try {
    const data = snapshot();
    const json = mode === 'browser' ? await runInBrowser(data) : await runOnServer(data);
    $('status').textContent = json.ok ? 'ok' : json.stage ?? 'error';
    $('status').className = json.ok ? 'ok' : 'bad';
    $('output').textContent = format(json);
  } catch (err) {
    $('status').textContent = 'error';
    $('status').className = 'bad';
    $('output').textContent = String(err.stack ?? err);
  }
}

async function init() {
  setupPrefs();
  try {
    const res = await fetch('/exercises.json');
    const data = await res.json();
    exercises = [free, ...data];
  } catch (err) {
    console.warn('No exercises.json', err);
  }
  renderYears();
  setupHighlighting();
  selectExercise(localStorage.getItem('c-code-lab:last') || 'free');
  setupResizablePanels();
}

$('run').addEventListener('click', () => run('browser'));
if ($('runServer')) $('runServer').addEventListener('click', () => run('server'));

$('save').addEventListener('click', () => {
  persistSnapshot();
  $('status').textContent = 'salvato';
  $('status').className = 'ok';
});

$('reset').addEventListener('click', () => {
  const name = current?.title ?? 'questo esercizio';
  const ok = window.confirm(`Ripristinare i file originali di ${name}?\n\nVerranno cancellate le modifiche locali a solution.c, tester.c, aux.h, aux.c e stdin per questo esercizio.`);
  if (!ok) return;
  localStorage.removeItem(saveKey());
  setEditors(current);
  $('status').textContent = 'ripristinato';
  $('status').className = '';
});
$('year').addEventListener('change', renderList);
$('exerciseSelect').addEventListener('change', () => selectExercise($('exerciseSelect').value));
$('prevExercise').addEventListener('click', () => moveExercise(-1));
$('nextExercise').addEventListener('click', () => moveExercise(1));
let autosaveTimer;
ids.forEach(id => $(id).addEventListener('input', () => {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(autosave, 250);
}));
document.querySelectorAll('[data-pane]').forEach(btn => btn.addEventListener('click', () => showPane(btn.dataset.pane)));

init();

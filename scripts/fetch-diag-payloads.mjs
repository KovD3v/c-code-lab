import { readFile, writeFile } from 'node:fs/promises';

const PATH = new URL('../public/exercises.json', import.meta.url);
const WS_URL = 'ws://esami2.diag.uniroma1.it:9801/tpexamws';

function payload(s, tag) {
  return s.startsWith(tag + '\n') ? s.slice(tag.length + 1)
    : s.startsWith(tag + ' ') ? s.slice(tag.length + 1)
    : '';
}

function ask(id, timeoutMs = 4200) {
  return new Promise((resolve) => {
    const out = { text: '', codees: '', auxh: '', auxc: '', status: [], raw: [] };
    const ws = new WebSocket(WS_URL);
    let auxCount = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { ws.close(); } catch {}
      resolve(out);
    };
    const timer = setTimeout(finish, timeoutMs);
    const sendLater = (ms, msg) => setTimeout(() => { try { ws.send(msg); } catch {} }, ms);
    ws.onopen = () => {
      ws.send(`!id ${id}`);
      sendLater(160, '!setupdir');
      sendLater(320, '!student 0000000;No;Name;noname@x.y;');
      sendLater(520, '!feserc');
      sendLater(720, '!text');
      sendLater(920, '!auxh');
      sendLater(1120, '!auxc');
      sendLater(2200, finish);
    };
    ws.onmessage = (event) => {
      const s = String(event.data ?? '');
      out.raw.push(s.slice(0, 160));
      const text = payload(s, 'TEXT');
      const codees = payload(s, 'CODEES');
      const codeaux = payload(s, 'CODEAUX');
      if (text) out.text = text;
      else if (codees) out.codees = codees;
      else if (codeaux) {
        auxCount++;
        if (auxCount === 1 || codeaux.includes('#pragma once') || codeaux.includes('#ifndef')) out.auxh = codeaux;
        else out.auxc = codeaux;
      } else if (s.startsWith('STATUS')) out.status.push(s.replace(/^STATUS\s*/, ''));
      if (out.text && out.codees && out.auxh && out.auxc) finish();
    };
    ws.onerror = () => finish();
    ws.onclose = () => finish();
  });
}

const exercises = JSON.parse(await readFile(PATH, 'utf8'));
let updated = 0;
let unavailable = 0;

for (const [idx, ex] of exercises.entries()) {
  const id = new URLSearchParams(ex.sourceHref.split('?')[1] ?? '').get('id');
  if (!id) { unavailable++; continue; }
  process.stdout.write(`[${idx + 1}/${exercises.length}] ${ex.title} ... `);
  const got = await ask(id);
  if (got.text || got.codees || got.auxh || got.auxc) {
    if (got.text) ex.statementHtml = got.text;
    if (got.codees) ex.solution = got.codees;
    if (got.auxh) ex.auxH = got.auxh;
    if (got.auxc) ex.auxC = got.auxc;
    updated++;
    console.log('ok');
  } else {
    unavailable++;
    console.log(`no payload (${got.status.join(',') || 'empty'})`);
  }
}

await writeFile(PATH, JSON.stringify(exercises, null, 2), 'utf8');
console.log(JSON.stringify({ updated, unavailable }, null, 2));

# CP Lab

Sito temporaneo per esercitarsi sugli esercizi di Complementi di Programmazione DIAG: editor C, tracce 2024-2026, `aux.h`/`aux.c` ufficiali e tester nascosti dove disponibili.

Live: https://c-code-lab.vercel.app

## Avvio locale

```bash
bun install
bun run dev
# http://localhost:5177
```

Test:

```bash
bun run test
```

## Struttura

- `public/` — frontend statico servito da Vercel.
- `public/exercises.json` — archivio esercizi 2024-2026.
- `public/vendor/picoc-js.umd.js` — runner C nel browser.
- `scripts/` — script usati per recuperare payload DIAG e generare tester.
- `test/` — smoke/regression test del runner e parsing output.

## Runner

Il pulsante **Esegui** usa `picoc-js` nel browser:

- nessuna coda server;
- regge meglio 200-400 utenti temporanei;
- supporto C parziale, sufficiente per molti esercizi;
- `aux.h`/`aux.c`, soluzione e tester vengono concatenati prima dell'esecuzione;
- `#pragma once`, include locali e macro multi-linea vengono normalizzati prima di passare il codice a Picoc.

Se un esercizio non ha tester reale, il sito lo segnala invece di mostrare falsi `0 passati / 0 falliti`.

## Dati esercizi

`public/exercises.json` contiene 51 esercizi DIAG 2024-2026. I tester non sono ufficiali DIAG: sono casi di verifica generati manualmente/da script per simulare un feedback utile quando il sito originale restituisce output vuoto.

Stato attuale: gli esercizi recenti 2025-2026 hanno tester in larga parte coperti; alcuni esercizi 2024 restano senza tester reale.

## Cache client

Il codice utente viene salvato in `localStorage`, separato per esercizio. Il toggle **Autosave** permette di disattivare il salvataggio automatico; **Salva** resta manuale.

## Deploy

Il deploy è statico su Vercel:

```bash
vercel deploy --prod
```

Il progetto è pensato per essere collegato a GitHub/Vercel con deploy automatico da `main`.

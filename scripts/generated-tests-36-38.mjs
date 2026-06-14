import { readFile, writeFile } from 'node:fs/promises';

const path = new URL('../public/exercises.json', import.meta.url);
const exercises = JSON.parse(await readFile(path, 'utf8'));

const commonProtocol = String.raw`
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
        else if (*s == '|') printf("\\|");
        else if (*s == '\\') printf("\\\\");
        else putchar(*s);
    }
}

static void clab_pass(const char *name) {
    clab_passed++;
    printf("__CLAB_PASS__|");
    clab_print_escaped(name);
    printf("\n");
}

static void clab_fail(const char *name, const char *expected, const char *actual) {
    clab_failed++;
    printf("__CLAB_FAIL__|");
    clab_print_escaped(name);
    printf("|");
    clab_print_escaped(expected);
    printf("|");
    clab_print_escaped(actual);
    printf("\n");
}

static void clab_summary(void) {
    printf("__CLAB_SUMMARY__|%d|%d\n", clab_passed, clab_failed);
}
`;

const tester36 = String.raw`#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "aux.h"
${commonProtocol}

static Mat *make_mat(int n, const char *values) {
    Mat *m = mat_alloc(n, n);
    int k = 0;
    for (int r = 0; r < n; r++) {
        for (int c = 0; c < n; c++) {
            m->mat[r][c] = values[k++];
        }
    }
    return m;
}

static void free_mat(Mat *m) {
    if (m == NULL) return;
    if (m->rows > 0 && m->mat != NULL) free(m->mat[0]);
    free(m->mat);
    free(m);
}

static void char_repr(char value, char *buf, size_t cap) {
    if (value == ' ') snprintf(buf, cap, "' '");
    else if (value == '\0') snprintf(buf, cap, "0");
    else snprintf(buf, cap, "'%c'", value);
}

static void test_game(const char *name, int n, const char *values, char expected) {
    Mat *m = make_mat(n, values);
    char actual = pseudo_filetto(m);
    if (actual == expected) clab_pass(name);
    else {
        char exp_s[16], act_s[16];
        char_repr(expected, exp_s, sizeof exp_s);
        char_repr(actual, act_s, sizeof act_s);
        clab_fail(name, exp_s, act_s);
    }
    free_mat(m);
}

int main(void) {
    test_game("esempio diagonale principale X 4x4", 4,
              "XOOO"
              "OXXO"
              "OOXX"
              "OXXX", 'X');
    test_game("riga centrale O 3x3", 3,
              "XO "
              "OOO"
              "XX ", 'O');
    test_game("colonna X 4x4", 4,
              "OOXO"
              " OX "
              "XXXO"
              "OOX ", 'X');
    test_game("diagonale secondaria O 5x5", 5,
              "XXXXO"
              "XOXOX"
              "XXOXX"
              "XOXXX"
              "OXXXX", 'O');
    test_game("pareggio pieno 3x3", 3,
              "XOX"
              "OOX"
              "XXO", 'P');
    test_game("partita in corso 3x3", 3,
              "XO "
              " OX"
              "X O", 'C');
    test_game("diagonale principale X 3x3", 3,
              "XOO"
              "OX "
              "  X", 'X');
    test_game("ultima riga X 4x4", 4,
              "O O "
              "OXO "
              " OO "
              "XXXX", 'X');
    test_game("pareggio pieno 4x4", 4,
              "XOXO"
              "OOXX"
              "XXOO"
              "OXOX", 'P');
    test_game("riga di spazi non e vittoria", 3,
              "   "
              "XOX"
              " O ", 'C');
    clab_summary();
    return clab_failed ? 1 : 0;
}
`;

const tester37 = String.raw`#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "aux.h"
${commonProtocol}

static TipoLista list_from_string(const char *s) {
    TipoLista l = listaVuota();
    int n = (int)strlen(s);
    for (int i = n - 1; i >= 0; i--) l = cons(s[i], l);
    return l;
}

static void list_to_string(TipoLista l, char *buf, size_t cap) {
    size_t pos = 0;
    if (cap > 0) buf[0] = '\0';
    while (!estVuota(l)) {
        if (pos + 1 < cap) {
            buf[pos++] = car(l);
            buf[pos] = '\0';
        }
        l = cdr(l);
    }
}

static void test_count(const char *name, const char *input, int expected) {
    TipoLista l = list_from_string(input);
    int actual = conta_ripetizioni(l);
    if (actual == expected) clab_pass(name);
    else {
        char exp_s[32], act_s[32];
        snprintf(exp_s, sizeof exp_s, "%d", expected);
        snprintf(act_s, sizeof act_s, "%d", actual);
        clab_fail(name, exp_s, act_s);
    }
}

static void test_offset(const char *name, const char *input, const char *expected) {
    TipoLista l = list_from_string(input);
    TipoLista out = aggiungi_offset(l);
    char actual[256];
    list_to_string(out, actual, sizeof actual);
    if (strcmp(actual, expected) == 0) clab_pass(name);
    else clab_fail(name, expected, actual);
}

int main(void) {
    test_count("conta lista vuota", "", 0);
    test_count("conta nessuna ripetizione", "abcd", 0);
    test_count("conta esempio traccia", "abcadeba", 3);
    test_count("conta tutti uguali", "aaaaa", 4);
    test_count("conta duplicati multipli", "mississippi", 7);

    test_offset("offset lista vuota", "", "");
    test_offset("offset nessuna ripetizione", "abcd", "abcd");
    test_offset("offset esempio traccia", "abacac", "abccac");
    test_offset("offset tutti uguali", "aaaa", "acba");
    test_offset("offset ripetizioni con n futuro zero", "abcbad", "abcbad");
    clab_summary();
    return clab_failed ? 1 : 0;
}
`;

const tester38 = String.raw`#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "aux.h"
${commonProtocol}

static TipoAlbero N(TipoInfoAlbero info, TipoAlbero sx, TipoAlbero dx) {
    TipoAlbero a = (TipoAlbero)malloc(sizeof(TipoNodoAlbero));
    a->info = info;
    a->sinistro = sx;
    a->destro = dx;
    return a;
}

static void tree_to_string_rec(TipoAlbero a, char *buf, size_t cap, size_t *pos) {
    if (a == NULL) {
        int n = 0;
        if (*pos < cap) n = snprintf(buf + *pos, cap - *pos, ".");
        if (n > 0) *pos += (size_t)n;
        return;
    }
    int n = 0;
    if (*pos < cap) n = snprintf(buf + *pos, cap - *pos, "(%d,", a->info);
    if (n > 0) *pos += (size_t)n;
    tree_to_string_rec(a->sinistro, buf, cap, pos);
    if (*pos + 1 < cap) { buf[(*pos)++] = ','; buf[*pos] = '\0'; }
    tree_to_string_rec(a->destro, buf, cap, pos);
    if (*pos + 1 < cap) { buf[(*pos)++] = ')'; buf[*pos] = '\0'; }
}

static void tree_to_string(TipoAlbero a, char *buf, size_t cap) {
    size_t pos = 0;
    if (cap > 0) buf[0] = '\0';
    tree_to_string_rec(a, buf, cap, &pos);
}

static int tree_eq(TipoAlbero a, TipoAlbero b) {
    if (a == NULL || b == NULL) return a == b;
    return a->info == b->info &&
           tree_eq(a->sinistro, b->sinistro) &&
           tree_eq(a->destro, b->destro);
}

static void test_prune(const char *name, TipoAlbero input, TipoAlbero expected) {
    potatura(&input);
    if (tree_eq(input, expected)) clab_pass(name);
    else {
        char exp_s[512], act_s[512];
        tree_to_string(expected, exp_s, sizeof exp_s);
        tree_to_string(input, act_s, sizeof act_s);
        clab_fail(name, exp_s, act_s);
    }
}

int main(void) {
    test_prune("albero vuoto", NULL, NULL);
    test_prune("solo radice", N(5, NULL, NULL), N(5, NULL, NULL));
    test_prune("esempio traccia", N(5,
               N(3, N(6, NULL, NULL), N(8, NULL, NULL)),
               N(10, NULL, N(15, NULL, NULL))),
               N(5, N(3, NULL, N(8, NULL, NULL)), NULL));
    test_prune("mantiene figli non multipli e pota sotto", N(7,
               N(5, N(10, NULL, NULL), N(12, NULL, NULL)),
               N(11, NULL, N(22, NULL, NULL))),
               N(7, N(5, NULL, N(12, NULL, NULL)), N(11, NULL, NULL)));
    test_prune("figlio multiplo rimuove intero sottoalbero", N(4,
               N(8, N(9, NULL, NULL), N(10, NULL, NULL)),
               N(5, NULL, NULL)),
               N(4, NULL, N(5, NULL, NULL)));
    test_prune("valori negativi", N(-3,
               N(6, NULL, NULL),
               N(4, N(8, NULL, NULL), N(9, NULL, NULL))),
               N(-3, NULL, N(4, NULL, N(9, NULL, NULL))));
    test_prune("zero figlio di padre non zero", N(5,
               N(0, NULL, NULL),
               N(6, N(0, NULL, NULL), N(7, NULL, NULL))),
               N(5, NULL, N(6, NULL, N(7, NULL, NULL))));
    test_prune("catena potata ricorsivamente", N(2,
               N(3, N(6, NULL, NULL), NULL), NULL),
               N(2, N(3, NULL, NULL), NULL));
    test_prune("figli uguali alla radice rimossi", N(5,
               N(5, NULL, NULL), N(10, NULL, NULL)),
               N(5, NULL, NULL));
    test_prune("rami misti profondi", N(6,
               N(4, N(2, N(6, NULL, NULL), NULL), N(8, NULL, NULL)),
               N(9, N(27, NULL, NULL), N(10, NULL, NULL))),
               N(6, N(4, N(2, NULL, NULL), NULL), N(9, NULL, N(10, NULL, NULL))));
    clab_summary();
    return clab_failed ? 1 : 0;
}
`;

const updates = new Map([
    ['2025-esame-09-07-2025-a-esercizio-1', { expectedIndex: 36, tester: tester36 }],
    ['2025-esame-09-07-2025-a-esercizio-2', {
        expectedIndex: 37,
        tester: tester37,
        auxHFixes: [
            {
                description: 'declare conta_ripetizioni and aggiungi_offset in aux.h',
                apply(auxH) {
                    if (typeof auxH !== 'string' || auxH.includes('TipoLista aggiungi_offset(TipoLista lista);')) return auxH;
                    const marker = 'T next(IteratoreInsieme it);';
                    if (!auxH.includes(marker)) throw new Error('Cannot place exercise 37 prototypes in auxH');
                    return auxH.replace(marker, `${marker}\n\n// Dichiarazioni delle funzioni da scrivere\nint conta_ripetizioni(TipoLista lista);\nTipoLista aggiungi_offset(TipoLista lista);`);
                },
            },
        ],
    }],
    ['2025-esame-09-07-2025-a-esercizio-3', {
        expectedIndex: 38,
        tester: tester38,
        auxHFixes: [
            {
                description: 'declare potatura in aux.h',
                apply(auxH) {
                    if (typeof auxH !== 'string' || auxH.includes('void potatura(TipoAlbero* a);')) return auxH;
                    const marker = 'void stampaAlbero(TipoAlbero *a);';
                    if (!auxH.includes(marker)) throw new Error('Cannot place potatura prototype in exercise 38 auxH');
                    return auxH.replace(marker, `${marker}\n\n// Dichiarazione della funzione da scrivere\nvoid potatura(TipoAlbero* a);`);
                },
            },
        ],
    }],
]);

let changed = 0;
for (const [id, update] of updates) {
    const ex = exercises[update.expectedIndex];
    if (!ex || ex.id !== id) throw new Error(`Exercise mismatch at index ${update.expectedIndex}: expected ${id}`);
    ex.tester = update.tester;
    if (update.auxHFixes) {
        for (const fix of update.auxHFixes) {
            ex.auxH = fix.apply(ex.auxH);
        }
    }
    changed++;
}

await writeFile(path, JSON.stringify(exercises, null, 2) + '\n');
console.log(`updated ${changed} testers for exercises 36-38`);

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

const tester39 = String.raw`#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "aux.h"
${commonProtocol}

void sbarra_parola(Mat* m, const char* parola);

static Mat *make_mat(int rows, int cols, const char *values) {
    Mat *m = mat_alloc(rows, cols);
    int k = 0;
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
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

static void mat_to_string(const Mat *m, char *buf, size_t cap) {
    size_t pos = 0;
    if (cap > 0) buf[0] = '\0';
    if (m == NULL) {
        snprintf(buf, cap, "NULL");
        return;
    }
    for (int r = 0; r < m->rows; r++) {
        for (int c = 0; c < m->cols; c++) {
            if (pos + 1 < cap) {
                buf[pos++] = m->mat[r][c];
                buf[pos] = '\0';
            }
        }
        if (r + 1 < m->rows && pos + 1 < cap) {
            buf[pos++] = '/';
            buf[pos] = '\0';
        }
    }
}

static void test_sbarra(const char *name, int rows, int cols, const char *start, const char *word, const char *expected) {
    Mat *m = make_mat(rows, cols, start);
    sbarra_parola(m, word);
    char actual[256];
    mat_to_string(m, actual, sizeof actual);
    if (strcmp(actual, expected) == 0) clab_pass(name);
    else clab_fail(name, expected, actual);
    free_mat(m);
}

int main(void) {
    test_sbarra("orizzontale semplice", 3, 5, "ZQSNBBCASAIPLXK", "CASA", "ZQSNB/B----/IPLXK");
    test_sbarra("verticale semplice", 4, 3, "DXXOXXGXXABC", "DOG", "-XX/-XX/-XX/ABC");
    test_sbarra("parola assente non modifica", 2, 3, "ABCDEF", "GHI", "ABC/DEF");
    test_sbarra("matrice vuota", 0, 0, "", "A", "");
    test_sbarra("occorrenze multiple non sovrapposte", 4, 4, "ABXXXABXAXBXBXXX", "AB", "--XX/X--X/-XBX/-XXX");
    test_sbarra("sovrapposizione orizzontale TATA", 3, 6, "ZQSNBATATATAIPLXKM", "TATA", "ZQSNBA/----TA/IPLXKM");
    test_sbarra("stesso inizio preferisce orizzontale", 4, 5, "ZCASABASNBESAMEIALXK", "CASA", "Z----/BASNB/ESAME/IALXK");
    test_sbarra("orizzontale blocca verticale sovrapposta", 3, 3, "ABABXXAXX", "ABA", "---/BXX/AXX");
    test_sbarra("parola di un carattere", 2, 3, "ABACAD", "A", "-B-/C-D");
    test_sbarra("sovrapposizione verticale", 4, 1, "AAAA", "AAA", "-/-/-/A");
    clab_summary();
    return clab_failed ? 1 : 0;
}
`;

const tester40 = String.raw`#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "aux.h"
${commonProtocol}

TipoLista ripeti_elementi(TipoLista lista, int* ripetizioni);
TipoLista ripeti_elementi_da_consonante(TipoLista lista, int* ripetizioni);

typedef TipoLista (*ListFun)(TipoLista, int*);

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

static void test_list_fun(const char *name, ListFun f, const char *input, int *reps, const char *expected) {
    TipoLista l = list_from_string(input);
    TipoLista out = f(l, reps);
    char actual[256];
    list_to_string(out, actual, sizeof actual);
    if (strcmp(actual, expected) == 0) clab_pass(name);
    else clab_fail(name, expected, actual);
}

int main(void) {
    { int r[] = {1,0,1,3,2}; test_list_fun("ripeti_elementi esempio", ripeti_elementi, "pfaps", r, "papppss"); }
    { int r[] = {7}; test_list_fun("ripeti_elementi lista vuota", ripeti_elementi, "", r, ""); }
    { int r[] = {0,0,0}; test_list_fun("ripeti_elementi tutti zero", ripeti_elementi, "abc", r, ""); }
    { int r[] = {1,1,1,1}; test_list_fun("ripeti_elementi una copia", ripeti_elementi, "test", r, "test"); }
    { int r[] = {0,3,2}; test_list_fun("ripeti_elementi salta e ripete", ripeti_elementi, "abc", r, "bbbcc"); }
    { int r[] = {0,3,2,3,0}; test_list_fun("da_consonante esempio", ripeti_elementi_da_consonante, "eakal", r, "eakkaaa"); }
    { int r[] = {2,1,0}; test_list_fun("da_consonante inizia consonante", ripeti_elementi_da_consonante, "bat", r, "bba"); }
    { int r[] = {0,0,0,0,0}; test_list_fun("da_consonante nessuna consonante", ripeti_elementi_da_consonante, "aeiou", r, "aeiou"); }
    { int r[] = {5,2,0,2}; test_list_fun("da_consonante consonante con zero", ripeti_elementi_da_consonante, "aacd", r, "aadd"); }
    { int r[] = {4}; test_list_fun("da_consonante lista vuota", ripeti_elementi_da_consonante, "", r, ""); }
    clab_summary();
    return clab_failed ? 1 : 0;
}
`;

const tester41 = String.raw`#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "aux.h"
${commonProtocol}

TipoAlbero potaAntenatiMaggiori(TipoAlbero a);

static TipoAlbero N(TipoInfoAlbero info, TipoAlbero sx, TipoAlbero dx) {
    return creaAlbBin(info, sx, dx);
}

static void tree_to_string_rec(TipoAlbero a, char *buf, size_t cap, size_t *pos) {
    if (a == NULL) {
        if (*pos + 2 < cap) { buf[(*pos)++] = '('; buf[(*pos)++] = ')'; buf[*pos] = '\0'; }
        return;
    }
    int n = 0;
    if (*pos < cap) n = snprintf(buf + *pos, cap - *pos, "(%d ", a->info);
    if (n > 0) *pos += (size_t)n;
    tree_to_string_rec(a->sinistro, buf, cap, pos);
    if (*pos + 1 < cap) { buf[(*pos)++] = ' '; buf[*pos] = '\0'; }
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
    return a->info == b->info && tree_eq(a->sinistro, b->sinistro) && tree_eq(a->destro, b->destro);
}

static void test_tree(const char *name, TipoAlbero input, TipoAlbero expected) {
    TipoAlbero got = potaAntenatiMaggiori(input);
    if (tree_eq(got, expected)) clab_pass(name);
    else {
        char actual[512], exp[512];
        tree_to_string(got, actual, sizeof actual);
        tree_to_string(expected, exp, sizeof exp);
        clab_fail(name, exp, actual);
    }
}

static void test_new_tree_and_original(void) {
    TipoAlbero input = N(5, N(4, N(100, NULL, NULL), NULL), N(6, NULL, NULL));
    TipoAlbero expected = N(5, NULL, N(6, NULL, NULL));
    char before[512], after[512];
    tree_to_string(input, before, sizeof before);
    TipoAlbero got = potaAntenatiMaggiori(input);
    tree_to_string(input, after, sizeof after);
    int ok = tree_eq(got, expected) && got != input && strcmp(before, after) == 0;
    if (ok) clab_pass("nuovo albero e input preservato");
    else {
        char actual[512];
        tree_to_string(got, actual, sizeof actual);
        clab_fail("nuovo albero e input preservato", "risultato corretto, nuovo puntatore, input invariato", actual);
    }
}

int main(void) {
    test_tree("albero vuoto", NULL, NULL);
    test_tree("solo radice", N(7, NULL, NULL), N(7, NULL, NULL));
    test_tree("esempio traccia", N(3, N(5, N(6, N(3, NULL, NULL), N(9, NULL, NULL)), N(2, N(10, NULL, NULL), N(4, NULL, NULL))), N(10, NULL, N(20, NULL, NULL))), N(3, N(5, N(6, NULL, N(9, NULL, NULL)), NULL), N(10, NULL, N(20, NULL, NULL))));
    test_tree("figlio minore pruna sottoalbero", N(5, N(4, N(100, NULL, NULL), NULL), N(6, NULL, NULL)), N(5, NULL, N(6, NULL, NULL)));
    test_tree("uguaglianze mantenute", N(5, N(5, N(5, NULL, NULL), NULL), N(5, NULL, NULL)), N(5, N(5, N(5, NULL, NULL), NULL), N(5, NULL, NULL)));
    test_tree("valori negativi", N(-1, N(-2, NULL, N(0, NULL, NULL)), N(0, N(-1, NULL, NULL), N(1, NULL, NULL))), N(-1, NULL, N(0, NULL, N(1, NULL, NULL))));
    test_tree("antenato profondo maggiore", N(10, N(12, N(11, NULL, NULL), N(13, NULL, NULL)), N(10, N(9, NULL, NULL), N(11, NULL, NULL))), N(10, N(12, NULL, N(13, NULL, NULL)), N(10, NULL, N(11, NULL, NULL))));
    test_tree("cammini non decrescenti", N(1, N(2, N(3, NULL, NULL), N(2, NULL, NULL)), N(1, NULL, N(4, NULL, NULL))), N(1, N(2, N(3, NULL, NULL), N(2, NULL, NULL)), N(1, NULL, N(4, NULL, NULL))));
    test_tree("rami misti", N(8, N(9, N(7, NULL, NULL), N(10, NULL, NULL)), N(6, NULL, N(100, NULL, NULL))), N(8, N(9, NULL, N(10, NULL, NULL)), NULL));
    test_new_tree_and_original();
    clab_summary();
    return clab_failed ? 1 : 0;
}
`;

const updates = new Map([
    ['2025-esame-09-07-2025-b-esercizio-1', { tester: tester39 }],
    ['2025-esame-09-07-2025-b-esercizio-2', { tester: tester40 }],
    ['2025-esame-09-07-2025-b-esercizio-3', {
        tester: tester41,
        auxHFixes: [
            [
                'const TipoInfoAlbero ERRORE_InfoAlbBin = -99999;',
                'static const TipoInfoAlbero ERRORE_InfoAlbBin = -99999;'
            ],
        ],
    }],
]);

let changed = 0;
for (const [id, update] of updates) {
    const ex = exercises.find((item) => item.id === id);
    if (!ex) throw new Error(`Exercise not found: ${id}`);
    ex.tester = update.tester;
    if (update.auxHFixes) {
        for (const [from, to] of update.auxHFixes) {
            if (typeof ex.auxH === 'string' && ex.auxH.includes(from)) {
                ex.auxH = ex.auxH.replace(from, to);
            }
        }
    }
    changed++;
}

await writeFile(path, JSON.stringify(exercises, null, 2) + '\n');
console.log(`updated ${changed} testers for exercises 39-41`);

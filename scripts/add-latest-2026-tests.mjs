import { readFile, writeFile } from 'node:fs/promises';

const path = new URL('../public/exercises.json', import.meta.url);
const exercises = JSON.parse(await readFile(path, 'utf8'));

const commonProtocol = `
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
        if (*s == '\\n') printf("\\\\n");
        else if (*s == '\\r') printf("\\\\r");
        else if (*s == '|') printf("\\\\|");
        else if (*s == '\\\\') printf("\\\\\\\\");
        else putchar(*s);
    }
}

static CLAB_UNUSED void clab_pass(const char *name) {
    clab_passed++;
    printf("__CLAB_PASS__|");
    clab_print_escaped(name);
    printf("\\n");
}

static CLAB_UNUSED void clab_fail(const char *name, const char *expected, const char *actual) {
    clab_failed++;
    printf("__CLAB_FAIL__|");
    clab_print_escaped(name);
    printf("|");
    clab_print_escaped(expected);
    printf("|");
    clab_print_escaped(actual);
    printf("\\n");
}

#define TEST_INT(name, actual, expected) do { \\
    long long clab_a = (long long)(actual); \\
    long long clab_e = (long long)(expected); \\
    char clab_as[64], clab_es[64]; \\
    snprintf(clab_as, sizeof clab_as, "%lld", clab_a); \\
    snprintf(clab_es, sizeof clab_es, "%lld", clab_e); \\
    if (clab_a == clab_e) clab_pass(name); \\
    else clab_fail(name, clab_es, clab_as); \\
} while (0)
`;

const tester48 = `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "aux.h"
${commonProtocol}
void minimizza_blocco(Mat* m, int x, int y, int w, int h);

static Mat* make_mat(int rows, int cols, const int *values) {
    Mat *m = mat_alloc(rows, cols);
    for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) m->mat[r][c] = values[r * cols + c];
    return m;
}
static void mat_to_string(Mat *m, char *buf, size_t cap) {
    size_t pos = 0;
    for (int r = 0; r < m->rows; r++) {
        for (int c = 0; c < m->cols; c++) {
            pos += snprintf(buf + pos, pos < cap ? cap - pos : 0, "%s%d", (r || c) ? "," : "", m->mat[r][c]);
        }
    }
}
static void test_mat(const char *name, int rows, int cols, const int *start, int x, int y, int w, int h, const int *expected) {
    Mat *m = make_mat(rows, cols, start);
    minimizza_blocco(m, x, y, w, h);
    int ok = 1;
    for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) if (m->mat[r][c] != expected[r * cols + c]) ok = 0;
    if (ok) clab_pass(name);
    else { char a[512], e[512]; mat_to_string(m, a, sizeof a); Mat *em = make_mat(rows, cols, expected); mat_to_string(em, e, sizeof e); clab_fail(name, e, a); free(em->mat[0]); free(em->mat); free(em); }
    free(m->mat[0]); free(m->mat); free(m);
}

int main(void) {
    { int a[]={9,9,8,1,2,5,6,2,6,3,8,2,6,4,5,6,2,3,0,6}; int e[]={9,9,8,1,2,5,6,2,6,3,8,0,0,0,5,6,0,0,0,6}; test_mat("esempio 1",4,5,a,2,1,3,3,e); }
    { int a[]={9,9,8,1,2,5,6,2,6,3,8,2,6,4,3,6,2,3,5,6}; int e[]={9,9,8,1,2,5,6,2,6,3,8,2,6,3,3,6,2,3,3,3}; test_mat("esempio 2 clipping",4,5,a,3,2,3,2,e); }
    { int a[]={4,2,7,1}; int e[]={1,1,1,1}; test_mat("intera 2x2",2,2,a,0,0,2,2,e); }
    { int a[]={5,4,3,2,1,0}; int e[]={5,4,3,2,1,0}; test_mat("singola cella resta uguale",2,3,a,1,2,1,1,e); }
    { int a[]={8,7,6,5,4,3,2,1,0}; int e[]={8,7,6,5,1,1,2,1,1}; test_mat("blocco 2x2 centrale",3,3,a,1,1,2,2,e); }
    { int a[]={3,-2,5,4,1,6}; int e[]={-2,-2,5,-2,-2,6}; test_mat("minimo negativo",2,3,a,0,0,2,2,e); }
    { int a[]={1,2,3,4,5,6,7,8,9}; int e[]={1,2,3,4,5,6,7,7,7}; test_mat("clipping colonna finale",3,3,a,2,0,5,1,e); }
    { int a[]={9,8,7,6,5,4,3,2,1}; int e[]={9,8,7,3,3,3,3,3,3}; test_mat("clipping righe finali",3,3,a,1,0,3,5,e); }
    { int a[]={4,9,1,8,7,6}; int e[]={4,9,1,6,6,6}; test_mat("una riga",2,3,a,1,0,3,1,e); }
    { int a[]={4,9,1,8,7,6}; int e[]={4,7,1,8,7,6}; test_mat("una colonna",2,3,a,0,1,1,2,e); }
    printf("__CLAB_SUMMARY__|%d|%d\\n", clab_passed, clab_failed);
    return clab_failed ? 1 : 0;
}
`;

const tester49 = `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "aux.h"
${commonProtocol}

static TipoLista list_from_array(const int *v, int n) {
    TipoLista l = listaVuota();
    for (int i = n - 1; i >= 0; i--) l = cons(v[i], l);
    return l;
}
static void list_to_string(TipoLista l, char *buf, size_t cap) {
    size_t pos = 0;
    pos += snprintf(buf + pos, pos < cap ? cap - pos : 0, "[");
    for (int first = 1; !estVuota(l); l = cdr(l), first = 0) {
        pos += snprintf(buf + pos, pos < cap ? cap - pos : 0, "%s%d", first ? "" : ",", car(l));
    }
    snprintf(buf + pos, pos < cap ? cap - pos : 0, "]");
}
static void test_list(const char *name, const int *intervals, int nIntervals, int *values, int k, const int *expected, int nExpected) {
    TipoLista l = list_from_array(intervals, nIntervals);
    TipoLista got = somma_intervalli(l, values, k);
    TipoLista exp = list_from_array(expected, nExpected);
    int ok = length(got) == nExpected;
    for (TipoLista a = got, b = exp; ok && !estVuota(a) && !estVuota(b); a = cdr(a), b = cdr(b)) ok = car(a) == car(b);
    if (ok) clab_pass(name);
    else { char as[256], es[256]; list_to_string(got, as, sizeof as); list_to_string(exp, es, sizeof es); clab_fail(name, es, as); }
}

int main(void) {
    int v1[] = {1,-3,1,0,4,-3,3,3};
    TEST_INT("somma esempio 0-3", somma_intervallo(v1, 8, 0, 3), -1);
    TEST_INT("somma singolo elemento", somma_intervallo(v1, 8, 4, 4), 4);
    TEST_INT("somma tutto array", somma_intervallo(v1, 8, 0, 7), 6);
    TEST_INT("somma con negativi", somma_intervallo(v1, 8, 1, 5), -1);
    int v2[] = {5,5,5}; TEST_INT("somma array corto", somma_intervallo(v2, 3, 0, 2), 15);
    { int in[]={0,1,2,3,3,5}; int exp[]={-2,1,1}; test_list("lista esempio", in, 6, v1, 8, exp, 3); }
    { int in[]={0,0}; int exp[]={1}; test_list("lista intervallo singolo", in, 2, v1, 8, exp, 1); }
    { int in[]={0,7}; int exp[]={6}; test_list("lista tutto array", in, 2, v1, 8, exp, 1); }
    { int in[]={1,1,2,2,3,3}; int exp[]={-3,1,0}; test_list("lista tre singoli", in, 6, v1, 8, exp, 3); }
    { int in[]={0,2,2,4,4,7}; int exp[]={-1,5,7}; test_list("lista intervalli sovrapposti al bordo", in, 6, v1, 8, exp, 3); }
    printf("__CLAB_SUMMARY__|%d|%d\\n", clab_passed, clab_failed);
    return clab_failed ? 1 : 0;
}
`;

const tester50 = `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "aux.h"
${commonProtocol}
void rileva_discontinuita(TipoAlbero alb);

static TipoAlbero N(int info, TipoAlbero sx, TipoAlbero dx) {
    TipoAlbero a;
    creaAlbBin(&a, info, &sx, &dx);
    return a;
}
static void tree_to_string_rec(TipoAlbero a, char *buf, size_t cap, size_t *pos) {
    if (a == NULL) { *pos += snprintf(buf + *pos, *pos < cap ? cap - *pos : 0, "()"); return; }
    *pos += snprintf(buf + *pos, *pos < cap ? cap - *pos : 0, "(%d ", a->info);
    tree_to_string_rec(a->sinistro, buf, cap, pos);
    *pos += snprintf(buf + *pos, *pos < cap ? cap - *pos : 0, " ");
    tree_to_string_rec(a->destro, buf, cap, pos);
    *pos += snprintf(buf + *pos, *pos < cap ? cap - *pos : 0, ")");
}
static void tree_to_string(TipoAlbero a, char *buf, size_t cap) { size_t pos = 0; tree_to_string_rec(a, buf, cap, &pos); }
static int tree_eq(TipoAlbero a, TipoAlbero b) {
    if (!a || !b) return a == b;
    return a->info == b->info && tree_eq(a->sinistro, b->sinistro) && tree_eq(a->destro, b->destro);
}
static void test_tree(const char *name, TipoAlbero input, TipoAlbero expected) {
    rileva_discontinuita(input);
    if (tree_eq(input, expected)) clab_pass(name);
    else { char as[512], es[512]; tree_to_string(input, as, sizeof as); tree_to_string(expected, es, sizeof es); clab_fail(name, es, as); }
}

int main(void) {
    test_tree("esempio traccia", N(6,N(2,N(1,NULL,NULL),N(7,N(3,NULL,NULL),N(5,NULL,NULL))),N(4,N(5,NULL,NULL),N(2,NULL,NULL))), N(6,N(2,N(1,NULL,NULL),N(2,N(2,NULL,NULL),N(2,NULL,NULL))),N(4,N(4,NULL,NULL),N(2,NULL,NULL))));
    test_tree("solo radice", N(5,NULL,NULL), N(5,NULL,NULL));
    test_tree("gia monotono", N(9,N(7,N(7,NULL,NULL),N(1,NULL,NULL)),N(8,NULL,N(2,NULL,NULL))), N(9,N(7,N(7,NULL,NULL),N(1,NULL,NULL)),N(8,NULL,N(2,NULL,NULL))));
    test_tree("figlio sinistro maggiore", N(3,N(4,NULL,NULL),NULL), N(3,N(3,NULL,NULL),NULL));
    test_tree("figlio destro maggiore", N(3,NULL,N(9,NULL,NULL)), N(3,NULL,N(3,NULL,NULL)));
    test_tree("catena cascata", N(5,N(6,N(7,NULL,NULL),NULL),NULL), N(5,N(5,N(5,NULL,NULL),NULL),NULL));
    test_tree("uguaglianze ammesse", N(5,N(5,NULL,NULL),N(5,NULL,NULL)), N(5,N(5,NULL,NULL),N(5,NULL,NULL)));
    test_tree("violazione dopo nodo corretto", N(8,N(3,NULL,N(4,NULL,NULL)),NULL), N(8,N(3,NULL,N(3,NULL,NULL)),NULL));
    test_tree("misto profondo", N(10,N(12,N(1,NULL,NULL),N(20,NULL,NULL)),N(9,N(11,NULL,NULL),N(2,NULL,NULL))), N(10,N(10,N(1,NULL,NULL),N(10,NULL,NULL)),N(9,N(9,NULL,NULL),N(2,NULL,NULL))));
    test_tree("ramo destro profondo", N(4,NULL,N(3,NULL,N(6,NULL,N(2,NULL,NULL)))), N(4,NULL,N(3,NULL,N(3,NULL,N(2,NULL,NULL)))));
    printf("__CLAB_SUMMARY__|%d|%d\\n", clab_passed, clab_failed);
    return clab_failed ? 1 : 0;
}
`;

const updates = new Map([
  ['2026-esame-09-01-2026-esercizio-1', tester48],
  ['2026-esame-09-01-2026-esercizio-2', tester49],
  ['2026-esame-09-01-2026-esercizio-3', tester50],
]);
for (const ex of exercises) if (updates.has(ex.id)) ex.tester = updates.get(ex.id);
await writeFile(path, JSON.stringify(exercises, null, 2) + '\n');
console.log('updated', updates.size, 'latest 2026 testers');

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const path = process.env.CLAB_EXERCISES_PATH
  ? pathToFileURL(resolve(process.env.CLAB_EXERCISES_PATH))
  : new URL('../public/exercises.json', import.meta.url);
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

const tester33 = String.raw`#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include "aux.h"
${commonProtocol}

Mat* min_sottomatrice_3x3(Mat* grid);

static Mat *make_mat(int rows, int cols, const double *values) {
    Mat *m = mat_alloc(rows, cols);
    int k = 0;
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            m->mat[r][c] = values[k++];
        }
    }
    return m;
}

static void mat_to_string(const Mat *m, char *buf, size_t cap) {
    size_t pos = 0;
    int n;
    if (cap > 0) buf[0] = '\0';
    if (m == NULL) {
        snprintf(buf, cap, "NULL");
        return;
    }
    n = snprintf(buf + pos, cap > pos ? cap - pos : 0, "%dx%d:", m->rows, m->cols);
    if (n > 0) pos += (size_t)n;
    for (int r = 0; r < m->rows; r++) {
        if (pos + 1 < cap) { buf[pos++] = (r == 0 ? '[' : '/'); buf[pos] = '\0'; }
        for (int c = 0; c < m->cols; c++) {
            n = snprintf(buf + pos, cap > pos ? cap - pos : 0, c == 0 ? "%.6g" : ",%.6g", m->mat[r][c]);
            if (n > 0) pos += (size_t)n;
        }
    }
    if (pos + 1 < cap) { buf[pos++] = ']'; buf[pos] = '\0'; }
}

static int mat_matches_3x3(const Mat *m, const double expected[9], double eps) {
    if (m == NULL || m->rows != 3 || m->cols != 3) return 0;
    int k = 0;
    for (int r = 0; r < 3; r++) {
        for (int c = 0; c < 3; c++) {
            if (fabs(m->mat[r][c] - expected[k++]) > eps) return 0;
        }
    }
    return 1;
}

static void test_min_null(const char *name, Mat *input) {
    Mat *got = min_sottomatrice_3x3(input);
    if (got == NULL) clab_pass(name);
    else {
        char actual[256];
        mat_to_string(got, actual, sizeof actual);
        clab_fail(name, "NULL", actual);
    }
    if (input != NULL) mat_free(input);
}

static void test_min(const char *name, int rows, int cols, const double *values, const double expected[9]) {
    Mat *input = make_mat(rows, cols, values);
    Mat *got = min_sottomatrice_3x3(input);
    if (mat_matches_3x3(got, expected, 1e-9)) clab_pass(name);
    else {
        char exp[256], actual[256];
        Mat expm;
        double *rowptrs[3];
        expm.rows = 3;
        expm.cols = 3;
        expm.mat = rowptrs;
        for (int r = 0; r < 3; r++) rowptrs[r] = (double *)&expected[r * 3];
        mat_to_string(&expm, exp, sizeof exp);
        mat_to_string(got, actual, sizeof actual);
        clab_fail(name, exp, actual);
    }
    mat_free(input);
}

int main(void) {
    test_min_null("input NULL restituisce NULL", NULL);
    test_min_null("meno di tre righe", make_mat(2, 4, (const double[]){1,2,3,4,5,6,7,8}));
    test_min_null("meno di tre colonne", make_mat(4, 2, (const double[]){1,2,3,4,5,6,7,8}));
    test_min("matrice esattamente 3x3", 3, 3,
             (const double[]){1,2,3,4,5,6,7,8,9},
             (const double[]){1,2,3,4,5,6,7,8,9});
    test_min("esempio della traccia", 3, 6,
             (const double[]){9,9,8,1,3,5, 5,6,2,6,8,1, 8,2,6,4,0,4},
             (const double[]){1,3,5,6,8,1,4,0,4});
    test_min("minimo in basso a sinistra", 4, 4,
             (const double[]){1,2,3,4, 5,6,7,8, -10,-10,-10,9, -10,-10,-10,10},
             (const double[]){5,6,7,-10,-10,-10,-10,-10,-10});
    test_min("parita sceglie scansione per colonne", 4, 4,
             (const double[]){0,0,0,-10, 0,0,0,0, 0,0,0,0, -10,0,0,0},
             (const double[]){0,0,0,0,0,0,-10,0,0});
    test_min("valori double negativi", 3, 4,
             (const double[]){0.5,-1.5,-1,-1, 2,-2,-2,-2, 3,-3,-3,-3},
             (const double[]){-1.5,-1,-1,-2,-2,-2,-3,-3,-3});
    test_min("minimo su unica colonna di finestre", 5, 3,
             (const double[]){9,9,9, 8,8,8, -1,-2,-3, -4,-5,-6, -7,-8,-9},
             (const double[]){-1,-2,-3,-4,-5,-6,-7,-8,-9});
    test_min("minimo centrale in 5x5", 5, 5,
             (const double[]){9,9,9,9,9, 9,-5,-5,-5,9, 9,-5,-8,-5,9, 9,-5,-5,-5,9, 9,9,9,9,9},
             (const double[]){-5,-5,-5,-5,-8,-5,-5,-5,-5});
    clab_summary();
    return clab_failed ? 1 : 0;
}
`;

const tester34 = String.raw`#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "aux.h"
${commonProtocol}

TipoLista rimuovi_duplicati_scl(TipoLista lista);
TipoLista rimuovi_duplicati_da_i(TipoLista lista, int i);

static TipoLista list_from_array(const int *values, int n) {
    TipoLista l = listaVuota();
    for (int i = n - 1; i >= 0; i--) l = cons(values[i], l);
    return l;
}

static void list_to_string(TipoLista l, char *buf, size_t cap) {
    size_t pos = 0;
    int first = 1;
    if (cap > 0) buf[0] = '\0';
    if (pos + 1 < cap) { buf[pos++] = '['; buf[pos] = '\0'; }
    while (!estVuota(l)) {
        int n = snprintf(buf + pos, cap > pos ? cap - pos : 0, first ? "%d" : ",%d", car(l));
        if (n > 0) pos += (size_t)n;
        first = 0;
        l = cdr(l);
    }
    if (pos + 1 < cap) { buf[pos++] = ']'; buf[pos] = '\0'; }
}

static void test_scl(const char *name, const int *input_values, int input_n, const int *expected_values, int expected_n) {
    TipoLista input = list_from_array(input_values, input_n);
    TipoLista expected = list_from_array(expected_values, expected_n);
    char before[256], after[256], exp[256], actual[256];
    list_to_string(input, before, sizeof before);
    TipoLista got = rimuovi_duplicati_scl(input);
    list_to_string(input, after, sizeof after);
    list_to_string(expected, exp, sizeof exp);
    list_to_string(got, actual, sizeof actual);
    if (strcmp(actual, exp) == 0 && strcmp(before, after) == 0) clab_pass(name);
    else {
        char want[320], gotbuf[320];
        snprintf(want, sizeof want, "output=%s; input invariato=%s", exp, before);
        snprintf(gotbuf, sizeof gotbuf, "output=%s; input dopo=%s", actual, after);
        clab_fail(name, want, gotbuf);
    }
}

static void test_da_i(const char *name, const int *input_values, int input_n, int index, const int *expected_values, int expected_n) {
    TipoLista input = list_from_array(input_values, input_n);
    TipoLista expected = list_from_array(expected_values, expected_n);
    char before[256], after[256], exp[256], actual[256];
    list_to_string(input, before, sizeof before);
    TipoLista got = rimuovi_duplicati_da_i(input, index);
    list_to_string(input, after, sizeof after);
    list_to_string(expected, exp, sizeof exp);
    list_to_string(got, actual, sizeof actual);
    if (strcmp(actual, exp) == 0 && strcmp(before, after) == 0) clab_pass(name);
    else {
        char want[320], gotbuf[320];
        snprintf(want, sizeof want, "output=%s; input invariato=%s", exp, before);
        snprintf(gotbuf, sizeof gotbuf, "output=%s; input dopo=%s", actual, after);
        clab_fail(name, want, gotbuf);
    }
}

int main(void) {
    test_scl("scl lista vuota", NULL, 0, NULL, 0);
    test_scl("scl senza duplicati", (const int[]){-3,-1,0,2,5}, 5, (const int[]){-3,-1,0,2,5}, 5);
    test_scl("scl tutti uguali", (const int[]){7,7,7,7}, 4, (const int[]){7}, 1);
    test_scl("scl esempio traccia", (const int[]){1,1,5,5,9,9,9,9,11}, 9, (const int[]){1,5,9,11}, 4);
    test_scl("scl duplicati con negativi", (const int[]){-5,-5,-2,-2,-2,0,3,3}, 8, (const int[]){-5,-2,0,3}, 4);
    test_da_i("da_i esempio i tre", (const int[]){1,1,5,5,9,9,9,9,11}, 9, 3, (const int[]){1,1,5,5,9,11}, 6);
    test_da_i("da_i indice zero deduplica tutto", (const int[]){1,1,5,5,9,9,9,9,11}, 9, 0, (const int[]){1,5,9,11}, 4);
    test_da_i("da_i inizia nel gruppo centrale", (const int[]){1,1,2,2,2,3,3,4}, 8, 2, (const int[]){1,1,2,3,4}, 5);
    test_da_i("da_i indice fuori range", (const int[]){1,1,2,2}, 4, 7, (const int[]){1,1,2,2}, 4);
    test_da_i("da_i conserva duplicati prima di i", (const int[]){4,4,4,4}, 4, 1, (const int[]){4,4}, 2);
    clab_summary();
    return clab_failed ? 1 : 0;
}
`;

const tester35 = String.raw`#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "aux.h"
${commonProtocol}

void propaga_true(TipoAlbero a);

static TipoAlbero N(int info, TipoAlbero sx, TipoAlbero dx) {
    TipoAlbero a = (TipoAlbero)malloc(sizeof(TipoNodoAlbero));
    a->info = info;
    a->sinistro = sx;
    a->destro = dx;
    return a;
}

static int tree_eq(TipoAlbero a, TipoAlbero b) {
    if (a == NULL || b == NULL) return a == b;
    return a->info == b->info && tree_eq(a->sinistro, b->sinistro) && tree_eq(a->destro, b->destro);
}

static void tree_to_string_rec(TipoAlbero a, char *buf, size_t cap, size_t *pos) {
    if (a == NULL) {
        if (*pos + 2 < cap) { buf[(*pos)++] = '('; buf[(*pos)++] = ')'; buf[*pos] = '\0'; }
        return;
    }
    int n = snprintf(buf + *pos, cap > *pos ? cap - *pos : 0, "(%d ", a->info);
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

static void test_tree(const char *name, TipoAlbero input, TipoAlbero expected) {
    propaga_true(input);
    if (tree_eq(input, expected)) clab_pass(name);
    else {
        char exp[512], actual[512];
        tree_to_string(expected, exp, sizeof exp);
        tree_to_string(input, actual, sizeof actual);
        clab_fail(name, exp, actual);
    }
}

int main(void) {
    test_tree("albero vuoto", NULL, NULL);
    test_tree("foglia zero invariata", N(0, NULL, NULL), N(0, NULL, NULL));
    test_tree("foglia uno invariata", N(1, NULL, NULL), N(1, NULL, NULL));
    test_tree("solo sottoalbero sinistro tutto uno", N(0, N(1, NULL, NULL), NULL), N(1, N(1, NULL, NULL), NULL));
    test_tree("solo sottoalbero destro tutto uno", N(0, NULL, N(1, NULL, NULL)), N(1, NULL, N(1, NULL, NULL)));
    test_tree("figli zero non cambiano", N(0, N(0, NULL, NULL), N(0, NULL, NULL)), N(0, N(0, NULL, NULL), N(0, NULL, NULL)));
    test_tree("sottoalbero sinistro gia tutto uno", N(0, N(1, N(1, NULL, NULL), N(1, NULL, NULL)), N(0, NULL, NULL)), N(1, N(1, N(1, NULL, NULL), N(1, NULL, NULL)), N(0, NULL, NULL)));
    test_tree("esempio della traccia", N(0, N(1, N(0, NULL, NULL), N(0, NULL, NULL)), N(0, N(0, NULL, NULL), N(0, N(1, NULL, NULL), N(1, NULL, NULL)))), N(0, N(1, N(0, NULL, NULL), N(0, NULL, NULL)), N(1, N(0, NULL, NULL), N(1, N(1, NULL, NULL), N(1, NULL, NULL)))));
    test_tree("propagazione postordine a catena", N(0, N(0, N(1, NULL, NULL), NULL), NULL), N(1, N(1, N(1, NULL, NULL), NULL), NULL));
    test_tree("rami misti senza falso positivo alla radice", N(0, N(1, N(1, NULL, NULL), N(0, NULL, NULL)), N(0, N(0, NULL, NULL), N(0, NULL, NULL))), N(0, N(1, N(1, NULL, NULL), N(0, NULL, NULL)), N(0, N(0, NULL, NULL), N(0, NULL, NULL))));
    clab_summary();
    return clab_failed ? 1 : 0;
}
`;

const targets = [
  {
    index: 33,
    id: '2025-esame-16-06-2025-d-esercizio-1',
    tester: tester33,
  },
  {
    index: 34,
    id: '2025-esame-16-06-2025-d-esercizio-2',
    tester: tester34,
  },
  {
    index: 35,
    id: '2025-esame-16-06-2025-d-esercizio-3',
    tester: tester35,
    auxHFixes: [
      [
        'const TipoInfoAlbero ERRORE_InfoAlbBin = -99999;',
        'static const TipoInfoAlbero ERRORE_InfoAlbBin = -99999;',
      ],
    ],
  },
];

let changed = 0;
for (const target of targets) {
  const ex = exercises[target.index];
  if (!ex || ex.id !== target.id) {
    throw new Error(`Unexpected exercise at index ${target.index}: expected ${target.id}, found ${ex?.id ?? 'missing'}`);
  }
  ex.tester = target.tester;
  if (target.auxHFixes) {
    for (const [from, to] of target.auxHFixes) {
      if (typeof ex.auxH === 'string' && ex.auxH.includes(from)) {
        ex.auxH = ex.auxH.replace(from, to);
      }
    }
  }
  changed++;
}

await writeFile(path, JSON.stringify(exercises, null, 2) + '\n');
console.log(`updated ${changed} testers for exercises 33-35`);

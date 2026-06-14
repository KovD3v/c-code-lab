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

const tester42 = `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "aux.h"
${commonProtocol}

int* calcola_lunghezza(Mat* matrice);

static Mat *make_mat(int rows, int cols, const int *values) {
    Mat *m = mat_alloc(rows, cols);
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            m->mat[r][c] = values[r * cols + c];
        }
    }
    return m;
}

static void free_mat(Mat *m) {
    if (m == NULL) return;
    if (m->mat != NULL) {
        if (m->rows > 0 && m->mat[0] != NULL) free(m->mat[0]);
        free(m->mat);
    }
    free(m);
}

static void int_array_to_string(const int *v, int n, char *buf, size_t cap) {
    size_t pos = 0;
    pos += snprintf(buf + pos, pos < cap ? cap - pos : 0, "[");
    if (v == NULL) {
        pos += snprintf(buf + pos, pos < cap ? cap - pos : 0, "NULL");
    } else {
        for (int i = 0; i < n; i++) {
            pos += snprintf(buf + pos, pos < cap ? cap - pos : 0, "%s%d", i == 0 ? "" : ",", v[i]);
        }
    }
    snprintf(buf + pos, pos < cap ? cap - pos : 0, "]");
}

static int int_array_eq(const int *a, const int *b, int n) {
    if (a == NULL || b == NULL) return a == b;
    for (int i = 0; i < n; i++) if (a[i] != b[i]) return 0;
    return 1;
}

static void test_lengths(const char *name, int rows, int cols, const int *values, const int *expected) {
    Mat *m = make_mat(rows, cols, values);
    int *got = calcola_lunghezza(m);
    if (got != NULL && int_array_eq(got, expected, rows)) {
        clab_pass(name);
    } else {
        char as[256], es[256];
        int_array_to_string(got, rows, as, sizeof as);
        int_array_to_string(expected, rows, es, sizeof es);
        clab_fail(name, es, as);
    }
    free(got);
    free_mat(m);
}

static void test_null_result(const char *name, Mat *m) {
    int *got = calcola_lunghezza(m);
    if (got == NULL) clab_pass(name);
    else {
        char as[128];
        int n = m != NULL ? m->rows : 0;
        int_array_to_string(got, n, as, sizeof as);
        clab_fail(name, "NULL", as);
        free(got);
    }
}

int main(void) {
    test_null_result("matrice NULL", NULL);
    { Mat m = {0, 4, NULL}; test_null_result("zero righe", &m); }
    { Mat m = {3, 0, NULL}; test_null_result("zero colonne", &m); }
    { int a[] = {4,0,6,7, 1,2,20,8, 10,20,30,35, 4,3,2,1}; int e[] = {3,3,4,1}; test_lengths("esempio traccia", 4, 4, a, e); }
    { int a[] = {5,5,5,5, 1,1,1,1}; int e[] = {1,1}; test_lengths("righe costanti", 2, 4, a, e); }
    { int a[] = {9, 2, -3}; int e[] = {1,1,1}; test_lengths("colonna singola", 3, 1, a, e); }
    { int a[] = {-3,-2,-1,0, 0,-1,0,1, -5,-4,-6,-5}; int e[] = {4,3,2}; test_lengths("negativi e ripartenze", 3, 4, a, e); }
    { int a[] = {1,3,2,4,0,0,0, 9,1,2,0,1,2,3}; int e[] = {2,4}; test_lengths("sottosequenza contigua", 2, 7, a, e); }
    { int a[] = {1,2,1,2,3, 5,4,3,2,1, 1,2,3,0,1}; int e[] = {3,1,3}; test_lengths("righe miste", 3, 5, a, e); }
    { int a[] = {1,2,3,4,5,6}; int e[] = {6}; test_lengths("riga tutta crescente", 1, 6, a, e); }
    printf("__CLAB_SUMMARY__|%d|%d\\n", clab_passed, clab_failed);
    return clab_failed ? 1 : 0;
}
`;

const tester43 = `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "aux.h"
${commonProtocol}

int esegui_programma(int input, Coda* programma, Pila* memoria);
int* esegui_programmi(int input, Coda** programmi, Pila* memoria, int num_programmi);

static Coda *make_queue(const char *ops) {
    Coda *q = codaVuota();
    for (int i = 0; ops[i] != '\\0'; i++) inCoda(q, ops[i]);
    return q;
}

static Pila *make_stack(const int *values_top_first, int n) {
    Pila *p = pilaVuota();
    for (int i = n - 1; i >= 0; i--) inPila(p, values_top_first[i]);
    return p;
}

static int stack_eq(Pila *p, const int *expected_top_first, int n) {
    TipoNodoPila *cur = (p == NULL) ? NULL : *p;
    for (int i = 0; i < n; i++) {
        if (cur == NULL || cur->info != expected_top_first[i]) return 0;
        cur = cur->next;
    }
    return cur == NULL;
}

static void stack_to_string(Pila *p, char *buf, size_t cap) {
    size_t pos = 0;
    pos += snprintf(buf + pos, pos < cap ? cap - pos : 0, "[");
    TipoNodoPila *cur = (p == NULL) ? NULL : *p;
    for (int first = 1; cur != NULL; first = 0, cur = cur->next) {
        pos += snprintf(buf + pos, pos < cap ? cap - pos : 0, "%s%d", first ? "" : ",", cur->info);
    }
    snprintf(buf + pos, pos < cap ? cap - pos : 0, "]");
}

static void array_to_string(const int *v, int n, char *buf, size_t cap) {
    size_t pos = 0;
    pos += snprintf(buf + pos, pos < cap ? cap - pos : 0, "[");
    if (v == NULL) {
        pos += snprintf(buf + pos, pos < cap ? cap - pos : 0, "NULL");
    } else {
        for (int i = 0; i < n; i++) pos += snprintf(buf + pos, pos < cap ? cap - pos : 0, "%s%d", i ? "," : "", v[i]);
    }
    snprintf(buf + pos, pos < cap ? cap - pos : 0, "]");
}

static int array_eq(const int *a, const int *b, int n) {
    if (a == NULL || b == NULL) return a == b;
    for (int i = 0; i < n; i++) if (a[i] != b[i]) return 0;
    return 1;
}

static void test_programma(const char *name, int input, const char *ops, const int *mem, int nmem, int expected_result, const int *expected_mem, int n_expected_mem) {
    Coda *q = make_queue(ops);
    Pila *p = make_stack(mem, nmem);
    int got = esegui_programma(input, q, p);
    if (got == expected_result && stack_eq(p, expected_mem, n_expected_mem)) {
        clab_pass(name);
    } else {
        char as[256], es[256], astack[128], estack[128];
        stack_to_string(p, astack, sizeof astack);
        Pila *ep = make_stack(expected_mem, n_expected_mem);
        stack_to_string(ep, estack, sizeof estack);
        snprintf(as, sizeof as, "result=%d memoria=%s", got, astack);
        snprintf(es, sizeof es, "result=%d memoria=%s", expected_result, estack);
        clab_fail(name, es, as);
    }
}

static void test_programmi(const char *name, int input, const char **ops, int nprog, const int *mem, int nmem, const int *expected, const int *expected_mem, int n_expected_mem) {
    Coda **programmi = malloc(sizeof(Coda*) * (nprog > 0 ? nprog : 1));
    for (int i = 0; i < nprog; i++) programmi[i] = make_queue(ops[i]);
    Pila *p = make_stack(mem, nmem);
    int *got = esegui_programmi(input, programmi, p, nprog);
    if (got != NULL && array_eq(got, expected, nprog) && stack_eq(p, expected_mem, n_expected_mem)) {
        clab_pass(name);
    } else {
        char as[256], es[256], astack[128], estack[128], arr[128], exp[128];
        array_to_string(got, nprog, arr, sizeof arr);
        array_to_string(expected, nprog, exp, sizeof exp);
        stack_to_string(p, astack, sizeof astack);
        Pila *ep = make_stack(expected_mem, n_expected_mem);
        stack_to_string(ep, estack, sizeof estack);
        snprintf(as, sizeof as, "outputs=%s memoria=%s", arr, astack);
        snprintf(es, sizeof es, "outputs=%s memoria=%s", exp, estack);
        clab_fail(name, es, as);
    }
    free(got);
    free(programmi);
}

int main(void) {
    { int m[] = {9}; int em[] = {9}; test_programma("programma vuoto", 7, "", m, 1, 7, em, 1); }
    { test_programma("esempio w s", 5, "ws", NULL, 0, 10, NULL, 0); }
    { int m[] = {3,10}; int em[] = {17}; test_programma("esempio s s w", 4, "ssw", m, 2, 17, em, 1); }
    { test_programma("somma con pila vuota", 5, "s", NULL, 0, -1, NULL, 0); }
    { int em[] = {2}; test_programma("istruzione sconosciuta", 2, "wx", NULL, 0, -1, em, 1); }
    { test_programma("due scritture due somme", 3, "wwss", NULL, 0, 9, NULL, 0); }
    { int m[] = {-2}; test_programma("somma negativa poi memoria", 5, "sws", m, 1, 6, NULL, 0); }
    { int *got = esegui_programmi(4, NULL, pilaVuota(), 2); if (got == NULL) clab_pass("programmi NULL"); else { char as[64]; array_to_string(got, 2, as, sizeof as); clab_fail("programmi NULL", "NULL", as); free(got); } }
    { Coda **empty = malloc(sizeof(Coda*)); int *got = esegui_programmi(4, empty, pilaVuota(), 0); if (got == NULL) clab_pass("zero programmi"); else { char as[64]; array_to_string(got, 0, as, sizeof as); clab_fail("zero programmi", "NULL", as); free(got); } free(empty); }
    { const char *ops[] = {"ssw", "sw"}; int m[] = {3,10}; int exp[] = {17,34}; int em[] = {34}; test_programmi("sequenza con memoria condivisa", 4, ops, 2, m, 2, exp, em, 1); }
    printf("__CLAB_SUMMARY__|%d|%d\\n", clab_passed, clab_failed);
    return clab_failed ? 1 : 0;
}
`;

const tester44 = `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "aux.h"
${commonProtocol}

TipoAlbero riduzione_albero(TipoAlbero a, int k);

static TipoAlbero N(int info, TipoAlbero sx, TipoAlbero dx) {
    return creaAlbBin(info, sx, dx);
}

static TipoAlbero clone_tree(TipoAlbero a) {
    if (a == NULL) return NULL;
    return N(a->info, clone_tree(a->sinistro), clone_tree(a->destro));
}

static int tree_eq(TipoAlbero a, TipoAlbero b) {
    if (a == NULL || b == NULL) return a == b;
    return a->info == b->info && tree_eq(a->sinistro, b->sinistro) && tree_eq(a->destro, b->destro);
}

static int no_alias(TipoAlbero original, TipoAlbero result) {
    if (original == NULL || result == NULL) return 1;
    if (original == result) return 0;
    return no_alias(original->sinistro, result->sinistro) && no_alias(original->destro, result->destro);
}

static void tree_to_string_rec(TipoAlbero a, char *buf, size_t cap, size_t *pos) {
    if (a == NULL) {
        *pos += snprintf(buf + *pos, *pos < cap ? cap - *pos : 0, "()");
        return;
    }
    *pos += snprintf(buf + *pos, *pos < cap ? cap - *pos : 0, "(%d ", a->info);
    tree_to_string_rec(a->sinistro, buf, cap, pos);
    *pos += snprintf(buf + *pos, *pos < cap ? cap - *pos : 0, " ");
    tree_to_string_rec(a->destro, buf, cap, pos);
    *pos += snprintf(buf + *pos, *pos < cap ? cap - *pos : 0, ")");
}

static void tree_to_string(TipoAlbero a, char *buf, size_t cap) {
    size_t pos = 0;
    tree_to_string_rec(a, buf, cap, &pos);
}

static void test_tree(const char *name, TipoAlbero input, int k, TipoAlbero expected) {
    TipoAlbero before = clone_tree(input);
    TipoAlbero got = riduzione_albero(input, k);
    int ok_value = tree_eq(got, expected);
    int ok_alias = no_alias(input, got);
    int ok_original = tree_eq(input, before);
    if (ok_value && ok_alias && ok_original) {
        clab_pass(name);
    } else {
        char as[512], es[512], got_s[256], original_s[256];
        tree_to_string(got, got_s, sizeof got_s);
        tree_to_string(expected, es, sizeof es);
        tree_to_string(input, original_s, sizeof original_s);
        snprintf(as, sizeof as, "tree=%s alias=%s original=%s", got_s, ok_alias ? "no" : "yes", ok_original ? "unchanged" : original_s);
        clab_fail(name, es, as);
    }
}

int main(void) {
    test_tree("albero vuoto", NULL, 3, NULL);
    test_tree("radice singola mantenuta", N(10, NULL, NULL), 1, N(1, NULL, NULL));
    test_tree("radice singola rimossa", N(10, NULL, NULL), 2, NULL);
    test_tree("esempio traccia k3", N(10, N(2, N(1,NULL,NULL), N(4,NULL,NULL)), N(7, NULL, N(5, N(8,NULL,NULL), NULL))), 3, N(7, N(2,NULL,NULL), N(3,NULL,NULL)));
    test_tree("esempio con k1 mantiene tutti", N(10, N(2, N(1,NULL,NULL), N(4,NULL,NULL)), N(7, NULL, N(5, N(8,NULL,NULL), NULL))), 1, N(7, N(2, N(1,NULL,NULL), N(1,NULL,NULL)), N(3, NULL, N(2, N(1,NULL,NULL), NULL))));
    test_tree("esempio con k2 rimuove foglie", N(10, N(2, N(1,NULL,NULL), N(4,NULL,NULL)), N(7, NULL, N(5, N(8,NULL,NULL), NULL))), 2, N(7, N(2,NULL,NULL), N(3, NULL, N(2,NULL,NULL))));
    test_tree("soglia maggiore della dimensione", N(1, N(2,NULL,NULL), N(3,NULL,NULL)), 4, NULL);
    test_tree("catena sinistra", N(5, N(4, N(3, N(2,NULL,NULL), NULL), NULL), NULL), 2, N(4, N(3, N(2,NULL,NULL), NULL), NULL));
    test_tree("valori negativi e minimo", N(-5, N(10,NULL,NULL), N(2,NULL,NULL)), 1, N(-5, N(1,NULL,NULL), N(1,NULL,NULL)));
    test_tree("dimensione uguale a k", N(2, N(9,NULL,NULL), N(8,NULL,NULL)), 3, N(2, NULL, NULL));
    printf("__CLAB_SUMMARY__|%d|%d\\n", clab_passed, clab_failed);
    return clab_failed ? 1 : 0;
}
`;

function assertExercise(index, id) {
    if (!exercises[index] || exercises[index].id !== id) {
        throw new Error(`Exercise at index ${index} is not ${id}; found ${exercises[index]?.id ?? 'missing'}`);
    }
}

function replaceOnce(text, from, to, label) {
    if (to !== '' && text.includes(to)) return text;
    if (!text.includes(from)) {
        if (to === '') return text;
        throw new Error(`Cannot apply ${label}: expected text not found`);
    }
    return text.replace(from, to);
}

assertExercise(42, '2025-esame-05-09-2025-esercizio-1');
assertExercise(43, '2025-esame-05-09-2025-esercizio-2');
assertExercise(44, '2025-esame-05-09-2025-esercizio-3');

exercises[42].tester = tester42;
exercises[43].tester = tester43;
exercises[44].tester = tester44;

exercises[42].auxH = replaceOnce(
    exercises[42].auxH,
    'void vec_print(char *vec,int size);',
    'void vec_print(int *vec,int size);',
    'exercise 42 auxH vec_print type fix'
);

exercises[43].auxH = replaceOnce(
    exercises[43].auxH,
    '#include <iostream>\n',
    '',
    'exercise 43 auxH remove C++ header'
);
if (!exercises[43].auxH.includes('#define nullptr NULL')) {
    exercises[43].auxH = exercises[43].auxH.replace(
        '#include <stdlib.h>\n',
        '#include <stdlib.h>\n\n#ifndef nullptr\n#define nullptr NULL\n#endif\n'
    );
}

exercises[44].auxH = replaceOnce(
    exercises[44].auxH,
    'const TipoInfoAlbero ERRORE_InfoAlbBin = -99999;',
    'static const TipoInfoAlbero ERRORE_InfoAlbBin = -99999;',
    'exercise 44 auxH const linkage fix'
);

await writeFile(path, JSON.stringify(exercises, null, 2) + '\n');
console.log('updated tester fields for exercise indices 42, 43, 44 and minimal auxH compile fixes');

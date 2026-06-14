import { readFile, writeFile } from 'node:fs/promises';
const path = new URL('../public/exercises.json', import.meta.url);
const exercises = JSON.parse(await readFile(path, 'utf8'));

const proto = String.raw`
#if defined(__GNUC__)
#define CLAB_UNUSED __attribute__((unused))
#else
#define CLAB_UNUSED
#endif
static int clab_passed = 0, clab_failed = 0;
static CLAB_UNUSED void clab_print_escaped(const char *s){ if(!s){printf("(null)");return;} for(;*s;s++){ if(*s=='\n')printf("\\n"); else if(*s=='\r')printf("\\r"); else if(*s=='|')printf("\\|"); else if(*s=='\\')printf("\\\\"); else putchar(*s);} }
static void clab_pass(const char *name){ clab_passed++; printf("__CLAB_PASS__|"); clab_print_escaped(name); printf("\n"); }
static void clab_fail(const char *name,const char *expected,const char *actual){ clab_failed++; printf("__CLAB_FAIL__|"); clab_print_escaped(name); printf("|"); clab_print_escaped(expected); printf("|"); clab_print_escaped(actual); printf("\n"); }
static void clab_summary(void){ printf("__CLAB_SUMMARY__|%d|%d\n", clab_passed, clab_failed); }
`;

const tester30 = String.raw`#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "aux.h"
${proto}
static Mat* make_mat(int rows,int cols,const int*v){ Mat*m=mat_alloc(rows,cols); for(int r=0;r<rows;r++)for(int c=0;c<cols;c++)m->mat[r][c]=v[r*cols+c]; return m; }
static void mat_to_str(const Mat*m,char*b,size_t cap){ size_t p=0; if(!m){snprintf(b,cap,"NULL");return;} for(int r=0;r<m->rows;r++)for(int c=0;c<m->cols;c++)p+=snprintf(b+p,p<cap?cap-p:0,"%s%d",(r||c)?",":"",m->mat[r][c]); }
static int same_mat(const Mat*m,const int*e,int rows,int cols){ if(!m)return 0; if(m->rows!=rows||m->cols!=cols)return 0; for(int r=0;r<rows;r++)for(int c=0;c<cols;c++)if(m->mat[r][c]!=e[r*cols+c])return 0; return 1; }
static void test_null(const char*name,Mat*m){ Mat*out=max_sottomatrice_3x3(m); if(out==NULL)clab_pass(name); else{char as[256]; mat_to_str(out,as,sizeof as); clab_fail(name,"NULL",as);} }
static void test_mat(const char*name,int rows,int cols,const int*in,const int*exp){ Mat*m=make_mat(rows,cols,in); Mat*out=max_sottomatrice_3x3(m); if(same_mat(out,exp,3,3))clab_pass(name); else{char as[512],es[512]; Mat*em=make_mat(3,3,exp); mat_to_str(out,as,sizeof as); mat_to_str(em,es,sizeof es); clab_fail(name,es,as); mat_free(em);} if(out)mat_free(out); mat_free(m); }
int main(void){
 test_null("NULL input", NULL);
 {int a[]={1,2,3,4,5,6}; Mat*m=make_mat(2,3,a); test_null("meno di tre righe",m); mat_free(m);} 
 {int a[]={1,2,3,4,5,6}; Mat*m=make_mat(3,2,a); test_null("meno di tre colonne",m); mat_free(m);} 
 {int a[]={9,9,8,1,3,5,5,6,2,6,8,1,8,2,6,4,0,4}; int e[]={9,9,8,5,6,2,8,2,6}; test_mat("esempio traccia",3,6,a,e);} 
 {int a[]={1,2,3,4,5,6,7,8,9}; int e[]={1,2,3,4,5,6,7,8,9}; test_mat("esatta 3x3",3,3,a,e);} 
 {int a[]={1,1,1, 2,2,2, 3,3,3, 9,9,9}; int e[]={2,2,2,3,3,3,9,9,9}; test_mat("massimo verticale",4,3,a,e);} 
 {int a[]={1,2,9,9,9, 1,2,9,9,9, 1,2,9,9,9}; int e[]={9,9,9,9,9,9,9,9,9}; test_mat("massimo a destra",3,5,a,e);} 
 {int a[]={5,5,5,0,0, 5,5,5,0,0, 5,5,5,0,0, 0,0,0,9,9}; int e[]={5,5,5,5,5,5,5,5,5}; test_mat("tie prima per colonne",4,5,a,e);} 
 {int a[]={0,0,0, 0,7,0, 0,0,0, 8,8,8}; int e[]={0,7,0,0,0,0,8,8,8}; test_mat("massimo ultima finestra",4,3,a,e);} 
 {int a[]={4,1,4,1,4, 1,4,1,4,1, 4,1,4,1,4, 1,4,1,4,1}; int e[]={4,1,4,1,4,1,4,1,4}; test_mat("scacchiera tie",4,5,a,e);} 
 clab_summary(); return clab_failed?1:0; }
`;

const tester31 = String.raw`#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "aux.h"
${proto}
TipoLista specchia_lista(TipoLista lista);
TipoLista specchia_da_i(TipoLista lista, int i);
static TipoLista list_from(const int*v,int n){ TipoLista l=listaVuota(); for(int i=n-1;i>=0;i--)l=cons(v[i],l); return l; }
static void list_str(TipoLista l,char*b,size_t cap){ size_t p=0; for(;!estVuota(l);l=cdr(l))p+=snprintf(b+p,p<cap?cap-p:0,"%s%d",p?",":"",car(l)); }
static int same_list(TipoLista l,const int*e,int n){ for(int i=0;i<n;i++){ if(estVuota(l)||car(l)!=e[i])return 0; l=cdr(l);} return estVuota(l); }
static void test_list(const char*name,TipoLista(*fn)(TipoLista),const int*in,int n,const int*exp,int en){ TipoLista l=list_from(in,n); TipoLista out=fn(l); if(same_list(out,exp,en))clab_pass(name); else{char as[512],es[512]; list_str(out,as,sizeof as); TipoLista el=list_from(exp,en); list_str(el,es,sizeof es); clab_fail(name,es,as);} }
static TipoLista call_specchia_da_i_0(TipoLista l){return specchia_da_i(l,0);} static TipoLista call_specchia_da_i_1(TipoLista l){return specchia_da_i(l,1);} static TipoLista call_specchia_da_i_2(TipoLista l){return specchia_da_i(l,2);} static TipoLista call_specchia_da_i_4(TipoLista l){return specchia_da_i(l,4);} static TipoLista call_specchia_da_i_9(TipoLista l){return specchia_da_i(l,9);} 
int main(void){
 {int dummy[]={0}; test_list("specchia vuota", specchia_lista, dummy,0,dummy,0);} 
 {int in[]={5}; int e[]={5,5}; test_list("specchia singolo", specchia_lista, in,1,e,2);} 
 {int in[]={5,1,3,8}; int e[]={5,1,3,8,8,3,1,5}; test_list("specchia esempio", specchia_lista, in,4,e,8);} 
 {int in[]={1,2,3}; int e[]={1,2,3,3,2,1}; test_list("specchia tre", specchia_lista, in,3,e,6);} 
 {int in[]={-1,0,2}; int e[]={-1,0,2,2,0,-1}; test_list("specchia negativi", specchia_lista, in,3,e,6);} 
 {int in[]={5,1,3,8}; int e[]={5,1,3,8,8,3,1,5}; test_list("da_i zero", call_specchia_da_i_0, in,4,e,8);} 
 {int in[]={5,1,3,8}; int e[]={5,1,3,8,8,3}; test_list("da_i esempio i2", call_specchia_da_i_2, in,4,e,6);} 
 {int in[]={5,1,3,8}; int e[]={5,1,3,8,8}; test_list("da_i ultimo", call_specchia_da_i_4, in,4,e,5);} 
 {int in[]={5,1,3,8}; int e[]={5,1,3,8}; test_list("da_i oltre lunghezza", call_specchia_da_i_9, in,4,e,4);} 
 {int in[]={1,2,3}; int e[]={1,2,3,3,2}; test_list("da_i uno", call_specchia_da_i_1, in,3,e,5);} 
 clab_summary(); return clab_failed?1:0; }
`;

const tester32 = String.raw`#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "aux.h"
${proto}
static TipoAlbero N(char c, TipoAlbero sx, TipoAlbero dx){ TipoAlbero a=malloc(sizeof(TipoNodoAlbero)); a->info=c; a->sinistro=sx; a->destro=dx; return a; }
static int eq_tree(TipoAlbero a,TipoAlbero b){ if(!a||!b)return a==b; return a->info==b->info && eq_tree(a->sinistro,b->sinistro)&&eq_tree(a->destro,b->destro); }
static void str_rec(TipoAlbero a,char*b,size_t cap,size_t*p){ if(!a){*p+=snprintf(b+*p,*p<cap?cap-*p:0,"()");return;} *p+=snprintf(b+*p,*p<cap?cap-*p:0,"(%c ",a->info); str_rec(a->sinistro,b,cap,p); *p+=snprintf(b+*p,*p<cap?cap-*p:0," "); str_rec(a->destro,b,cap,p); *p+=snprintf(b+*p,*p<cap?cap-*p:0,")"); }
static void str_tree(TipoAlbero a,char*b,size_t cap){size_t p=0;str_rec(a,b,cap,&p);} 
static void test_tree(const char*name,TipoAlbero in,TipoAlbero exp){ valuta_espressione_binaria(in); if(eq_tree(in,exp))clab_pass(name); else{char as[512],es[512]; str_tree(in,as,sizeof as); str_tree(exp,es,sizeof es); clab_fail(name,es,as);} }
int main(void){
 test_tree("vuoto", NULL, NULL);
 test_tree("foglia true", N('t',NULL,NULL), N('t',NULL,NULL));
 test_tree("foglia false", N('f',NULL,NULL), N('f',NULL,NULL));
 test_tree("and true false", N('A',N('t',NULL,NULL),N('f',NULL,NULL)), N('f',N('t',NULL,NULL),N('f',NULL,NULL)));
 test_tree("or false true", N('O',N('f',NULL,NULL),N('t',NULL,NULL)), N('t',N('f',NULL,NULL),N('t',NULL,NULL)));
 test_tree("not sx", N('N',N('t',NULL,NULL),NULL), N('f',N('t',NULL,NULL),NULL));
 test_tree("not dx", N('N',NULL,N('f',NULL,NULL)), N('t',NULL,N('f',NULL,NULL)));
 test_tree("esempio traccia", N('O',N('A',N('t',NULL,NULL),N('f',NULL,NULL)),N('N',N('t',NULL,NULL),NULL)), N('f',N('f',N('t',NULL,NULL),N('f',NULL,NULL)),N('f',N('t',NULL,NULL),NULL)));
 test_tree("doppio not", N('N',N('N',N('f',NULL,NULL),NULL),NULL), N('f',N('t',N('f',NULL,NULL),NULL),NULL));
 test_tree("complesso", N('A',N('O',N('f',NULL,NULL),N('t',NULL,NULL)),N('N',NULL,N('f',NULL,NULL))), N('t',N('t',N('f',NULL,NULL),N('t',NULL,NULL)),N('t',NULL,N('f',NULL,NULL))));
 clab_summary(); return clab_failed?1:0; }
`;

for (const e of exercises) {
  if (e.id === '2025-esame-16-06-2025-c-esercizio-1') e.tester = tester30;
  if (e.id === '2025-esame-16-06-2025-c-esercizio-2') e.tester = tester31;
  if (e.id === '2025-esame-16-06-2025-c-esercizio-3') {
    e.tester = tester32;
    e.auxH = e.auxH.replace('const TipoInfoAlbero ERRORE_InfoAlbBin', 'static const TipoInfoAlbero ERRORE_InfoAlbBin');
  }
}
await writeFile(path, JSON.stringify(exercises, null, 2) + '\n');
console.log('updated 3 testers for exercises 30-32');

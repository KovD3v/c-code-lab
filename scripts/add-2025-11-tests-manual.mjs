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
#define TEST_INT(name, actual, expected) do { long long a=(long long)(actual), e=(long long)(expected); char as[64], es[64]; snprintf(as,sizeof as,"%lld",a); snprintf(es,sizeof es,"%lld",e); if(a==e) clab_pass(name); else clab_fail(name,es,as); } while(0)
`;

const tester45 = `#include <stdio.h>
#include <stdlib.h>
#include "aux.h"
${proto}
int* ruota_righe(Mat* matrice, int* rot_riga);
static Mat* make_mat(int rows,int cols,const int*v){ Mat*m=mat_alloc(rows,cols); for(int r=0;r<rows;r++)for(int c=0;c<cols;c++)m->mat[r][c]=v[r*cols+c]; return m; }
static void mat_str(Mat*m,char*b,size_t cap){ size_t p=0; for(int r=0;r<m->rows;r++)for(int c=0;c<m->cols;c++)p+=snprintf(b+p,p<cap?cap-p:0,"%s%d",(r||c)?",":"",m->mat[r][c]); }
static void free_mat(Mat*m){ if(!m)return; free(m->mat[0]); free(m->mat); free(m); }
static void test_mat(const char*name,int rows,int cols,const int*start,const int*rot,const int*exp){ Mat*m=make_mat(rows,cols,start); int*rr=malloc(sizeof(int)*rows); for(int i=0;i<rows;i++)rr[i]=rot[i]; ruota_righe(m,rr); int ok=1; for(int r=0;r<rows;r++)for(int c=0;c<cols;c++)if(m->mat[r][c]!=exp[r*cols+c])ok=0; if(ok)clab_pass(name); else{char as[512],es[512]; Mat*em=make_mat(rows,cols,exp); mat_str(m,as,sizeof as); mat_str(em,es,sizeof es); clab_fail(name,es,as); free_mat(em);} free(rr); free_mat(m); }
int main(void){
 {int a[]={9,9,8,1,5,6,2,6,8,2,6,4,6,2,3,0}; int r[]={2,0,1,3}; int e[]={8,1,9,9,5,6,2,6,4,8,2,6,2,3,0,6}; test_mat("esempio traccia",4,4,a,r,e);} 
 {int a[]={1,2,3}; int r[]={0}; int e[]={1,2,3}; test_mat("rotazione zero",1,3,a,r,e);} 
 {int a[]={1,2,3}; int r[]={1}; int e[]={3,1,2}; test_mat("una riga shift 1",1,3,a,r,e);} 
 {int a[]={1,2,3}; int r[]={2}; int e[]={2,3,1}; test_mat("una riga shift 2",1,3,a,r,e);} 
 {int a[]={1,2,3}; int r[]={3}; int e[]={1,2,3}; test_mat("shift pari a cols",1,3,a,r,e);} 
 {int a[]={1,2,3}; int r[]={4}; int e[]={3,1,2}; test_mat("shift maggiore di cols",1,3,a,r,e);} 
 {int a[]={1,2,3,4,5,6}; int r[]={1,2}; int e[]={3,1,2,5,6,4}; test_mat("due righe diverse",2,3,a,r,e);} 
 {int a[]={1,2,3,4,5,6}; int r[]={0,1,2}; int e[]={1,2,3,2,4,5}; test_mat("tre righe due colonne",3,2,a,r,e);} 
 {int a[]={7,8,9,10}; int r[]={9}; int e[]={10,7,8,9}; test_mat("shift grande",1,4,a,r,e);} 
 {int a[]={1,2,3,4}; int r[]={1,0,3,2}; int e[]={1,2,3,4}; test_mat("una colonna invariata",4,1,a,r,e);} 
 printf("__CLAB_SUMMARY__|%d|%d\n",clab_passed,clab_failed); return clab_failed?1:0; }
`;

const tester46 = `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "aux.h"
${proto}
static TipoLista list_from_chars(const char*s){ TipoLista l=listaVuota(); for(int i=(int)strlen(s)-1;i>=0;i--) l=cons(s[i],l); return l; }
int main(void){
 TEST_INT("esempio parziale", individua_parola(list_from_chars("feehsmae"), "esame"), 3);
 TEST_INT("esempio completo", individua_parola(list_from_chars("jiehsamfe"), "esame"), 5);
 TEST_INT("lista vuota", individua_parola(listaVuota(), "abc"), 0);
 TEST_INT("parola vuota", individua_parola(list_from_chars("abc"), ""), 0);
 TEST_INT("prefisso parziale", individua_parola(list_from_chars("abc"), "abcd"), 3);
 TEST_INT("ripetizioni", individua_parola(list_from_chars("aaaa"), "aa"), 2);
 { TipoLista v[]={list_from_chars("feehsmae"),list_from_chars("jiehsamfe"),list_from_chars("1ehsa")}; TEST_INT("totale esempio", occorrenze_totali(v,3,"esame"), 11); }
 { TipoLista v[]={listaVuota(),listaVuota()}; TEST_INT("totale liste vuote", occorrenze_totali(v,2,"abc"), 0); }
 { TipoLista v[]={list_from_chars("abc"),list_from_chars("zzz")}; TEST_INT("totale parziale e zero", occorrenze_totali(v,2,"abcd"), 3); }
 { TipoLista v[]={list_from_chars("aaaa"),list_from_chars("baaa"),list_from_chars("xyz")}; TEST_INT("totale ripetizioni", occorrenze_totali(v,3,"aa"), 4); }
 printf("__CLAB_SUMMARY__|%d|%d\n",clab_passed,clab_failed); return clab_failed?1:0; }
`;

const tester47 = `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "aux.h"
${proto}
static TipoAlbero N(int x, TipoAlbero sx, TipoAlbero dx){ return creaAlbBin(x,sx,dx); }
static int eq(TipoAlbero a, TipoAlbero b){ if(!a||!b)return a==b; return a->info==b->info && eq(a->sinistro,b->sinistro) && eq(a->destro,b->destro); }
static void str_rec(TipoAlbero a,char*b,size_t cap,size_t*p){ if(!a){*p+=snprintf(b+*p,*p<cap?cap-*p:0,"()");return;} *p+=snprintf(b+*p,*p<cap?cap-*p:0,"(%d ",a->info); str_rec(a->sinistro,b,cap,p); *p+=snprintf(b+*p,*p<cap?cap-*p:0," "); str_rec(a->destro,b,cap,p); *p+=snprintf(b+*p,*p<cap?cap-*p:0,")"); }
static void str_tree(TipoAlbero a,char*b,size_t cap){ size_t p=0; str_rec(a,b,cap,&p); }
static void test_tree(const char*name,TipoAlbero in,int val,TipoAlbero exp){ conta_occorrenze(in,val); if(eq(in,exp))clab_pass(name); else{char as[512],es[512]; str_tree(in,as,sizeof as); str_tree(exp,es,sizeof es); clab_fail(name,es,as);} }
int main(void){
 test_tree("esempio traccia", N(0,N(0,N(2,NULL,NULL),N(4,NULL,NULL)),N(0,N(3,NULL,NULL),N(6,N(7,NULL,NULL),N(1,NULL,NULL)))),2, N(4,N(2,N(2,NULL,NULL),N(4,NULL,NULL)),N(1,N(3,NULL,NULL),N(6,N(7,NULL,NULL),N(1,NULL,NULL)))));
 test_tree("nessuno zero", N(5,N(2,NULL,NULL),N(3,NULL,NULL)),2, N(5,N(2,NULL,NULL),N(3,NULL,NULL)));
 test_tree("zero foglia", N(0,NULL,NULL),2, N(0,NULL,NULL));
 test_tree("root zero due figli", N(0,N(2,NULL,NULL),N(3,NULL,NULL)),2, N(1,N(2,NULL,NULL),N(3,NULL,NULL)));
 test_tree("root conta zero aggiornato", N(0,N(0,NULL,NULL),N(2,NULL,NULL)),2, N(2,N(0,NULL,NULL),N(2,NULL,NULL)));
 test_tree("divisore tre", N(0,N(3,NULL,NULL),N(6,NULL,NULL)),3, N(2,N(3,NULL,NULL),N(6,NULL,NULL)));
 test_tree("zero interno senza multipli", N(0,N(0,N(5,NULL,NULL),NULL),N(7,NULL,NULL)),2, N(1,N(0,N(5,NULL,NULL),NULL),N(7,NULL,NULL)));
 test_tree("catena zeri", N(0,N(0,N(0,NULL,NULL),NULL),NULL),2, N(2,N(1,N(0,NULL,NULL),NULL),NULL));
 test_tree("multipli negativi", N(0,N(-4,NULL,NULL),N(5,NULL,NULL)),2, N(1,N(-4,NULL,NULL),N(5,NULL,NULL)));
 test_tree("multipli profondi", N(0,N(1,N(4,NULL,NULL),N(5,NULL,NULL)),N(0,N(8,NULL,NULL),NULL)),4, N(3,N(1,N(4,NULL,NULL),N(5,NULL,NULL)),N(1,N(8,NULL,NULL),NULL)));
 printf("__CLAB_SUMMARY__|%d|%d\n",clab_passed,clab_failed); return clab_failed?1:0; }
`;

const map = new Map([
 ['2025-esame-06-11-2025-esercizio-1', tester45],
 ['2025-esame-06-11-2025-esercizio-2', tester46],
 ['2025-esame-06-11-2025-esercizio-3', tester47],
]);
for (const e of exercises) {
  if (map.has(e.id)) e.tester = map.get(e.id);
  if (e.id === '2025-esame-06-11-2025-esercizio-1') e.auxH = e.auxH.replace('void vec_print(char *vec,int size);','void vec_print(int *vec,int size);');
  if (e.id === '2025-esame-06-11-2025-esercizio-3') e.auxH = e.auxH.replace('const TipoInfoAlbero ERRORE_InfoAlbBin = -99999;', 'static const TipoInfoAlbero ERRORE_InfoAlbBin = -99999;');
}
await writeFile(path, JSON.stringify(exercises, null, 2) + '\n');
console.log('updated 2025-11 testers 45-47');

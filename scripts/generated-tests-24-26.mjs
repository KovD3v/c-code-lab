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
#define TEST_INT(name, actual, expected) do { long long a=(long long)(actual), e=(long long)(expected); char as[64], es[64]; snprintf(as,sizeof as,"%lld",a); snprintf(es,sizeof es,"%lld",e); if(a==e) clab_pass(name); else clab_fail(name,es,as); } while(0)
`;
const tester24 = String.raw`#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include "aux.h"
${proto}
static Mat* make_mat(int n,const double*v){ Mat*m=mat_alloc(n,n); for(int r=0;r<n;r++)for(int c=0;c<n;c++)m->mat[r][c]=v[r*n+c]; return m; }
static void mat_str(const Mat*m,char*b,size_t cap){ size_t p=0; if(!m){snprintf(b,cap,"NULL");return;} for(int r=0;r<m->rows;r++)for(int c=0;c<m->cols;c++)p+=snprintf(b+p,p<cap?cap-p:0,"%s%.2f",(r||c)?",":"",m->mat[r][c]); }
static int same_mat(const Mat*m,const double*e,int rows,int cols){ if(!m)return 0; if(m->rows!=rows||m->cols!=cols)return 0; for(int r=0;r<rows;r++)for(int c=0;c<cols;c++)if(fabs(m->mat[r][c]-e[r*cols+c])>1e-9)return 0; return 1; }
static void test_null(const char*name,Mat*m){ Mat*out=max_local_3x3(m); if(!out)clab_pass(name); else{char as[256]; mat_str(out,as,sizeof as); clab_fail(name,"NULL",as);} }
static void test_mat(const char*name,int n,const double*in,const double*exp){ Mat*m=make_mat(n,in); Mat*out=max_local_3x3(m); if(same_mat(out,exp,n-2,n-2))clab_pass(name); else{char as[512],es[512]; Mat*em=mat_alloc(n-2,n-2); for(int r=0;r<n-2;r++)for(int c=0;c<n-2;c++)em->mat[r][c]=exp[r*(n-2)+c]; mat_str(out,as,sizeof as); mat_str(em,es,sizeof es); clab_fail(name,es,as);} }
int main(void){
 test_null("NULL input", NULL);
 {double a[]={1,2,3,4}; Mat*m=make_mat(2,a); test_null("n minore di 3",m);} 
 {double a[]={1,2,3,4,5,6,7,8,9}; double e[]={9}; test_mat("3x3 singola",3,a,e);} 
 {double a[]={9,9,8,1,5,6,2,6,8,2,6,4,6,2,2,2}; double e[]={9,9,8,6}; test_mat("esempio traccia",4,a,e);} 
 {double a[]={1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16}; double e[]={11,12,15,16}; test_mat("crescente 4x4",4,a,e);} 
 {double a[]={16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1}; double e[]={16,15,12,11}; test_mat("decrescente 4x4",4,a,e);} 
 {double a[]={0,-1,2,3,4,5,6,7,8}; double e[]={8}; test_mat("negativi",3,a,e);} 
 {double a[]={1,1,1,1,9,1,1,1,1,1,1,1,1,1,1,1}; double e[]={9,9,9,9}; test_mat("max condiviso",4,a,e);} 
 {double a[]={1,2,3,4,5,6,7,8,99,10,11,12,13,14,15,16}; double e[]={99,99,99,99}; test_mat("max centro basso",4,a,e);} 
 {double a[]={4,1,4,1,4,1,4,1,4}; double e[]={4}; test_mat("scacchiera",3,a,e);} 
 clab_summary(); return clab_failed?1:0; }
`;
const tester25 = String.raw`#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "aux.h"
${proto}
static void list_str(TipoLista l,char*b,size_t cap){ size_t p=0; for(;!estVuota(l);l=cdr(l))p+=snprintf(b+p,p<cap?cap-p:0,"%s%d",p?",":"",car(l)); }
static int same_list(TipoLista l,const int*e,int n){ for(int i=0;i<n;i++){ if(estVuota(l)||car(l)!=e[i])return 0; l=cdr(l);} return estVuota(l); }
static void test_bin(const char*name,unsigned char n,const int*exp){ TipoLista out=converti_binario(n); if(same_list(out,exp,8))clab_pass(name); else{char as[256],es[256]; list_str(out,as,sizeof as); TipoLista l=listaVuota(); for(int i=7;i>=0;i--)l=cons(exp[i],l); list_str(l,es,sizeof es); clab_fail(name,es,as);} }
int main(void){
 {int e[]={0,0,0,0,0,0,0,0}; test_bin("zero",0,e);} 
 {int e[]={1,0,1,0,0,0,0,0}; test_bin("cinque",5,e);} 
 {int e[]={0,0,1,0,0,1,1,0}; test_bin("cento",100,e);} 
 {int e[]={1,1,1,1,1,1,1,1}; test_bin("255",255,e);} 
 {int e[]={0,0,0,0,0,0,0,1}; test_bin("128",128,e);} 
 {int e[]={1,0,1,0,1,0,1,0}; test_bin("85",85,e);} 
 TEST_INT("max esempio 13", max_sottosequenza(13), 2);
 TEST_INT("max zero", max_sottosequenza(0), 0);
 TEST_INT("max tutti uno", max_sottosequenza(255), 8);
 TEST_INT("max alternato", max_sottosequenza(85), 1);
 clab_summary(); return clab_failed?1:0; }
`;
const tester26 = String.raw`#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "aux.h"
${proto}
static TipoAlbero N(int x, TipoAlbero sx, TipoAlbero dx){ return creaAlbBin(x,sx,dx); }
static TipoAlbero ref(TipoAlbero a){ if(!a||!filtro(a->info))return NULL; return N(a->info,ref(a->sinistro),ref(a->destro)); }
static int eq(TipoAlbero a,TipoAlbero b){ if(!a||!b)return a==b; return a->info==b->info&&eq(a->sinistro,b->sinistro)&&eq(a->destro,b->destro); }
static void str_rec(TipoAlbero a,char*b,size_t cap,size_t*p){ if(!a){*p+=snprintf(b+*p,*p<cap?cap-*p:0,"()");return;} *p+=snprintf(b+*p,*p<cap?cap-*p:0,"(%d ",a->info); str_rec(a->sinistro,b,cap,p); *p+=snprintf(b+*p,*p<cap?cap-*p:0," "); str_rec(a->destro,b,cap,p); *p+=snprintf(b+*p,*p<cap?cap-*p:0,")"); }
static void str_tree(TipoAlbero a,char*b,size_t cap){size_t p=0;str_rec(a,b,cap,&p);} 
static void test_tree(const char*name,TipoAlbero in){ TipoAlbero exp=ref(in); TipoAlbero out=rispetta_filtro(in); if(eq(out,exp))clab_pass(name); else{char as[512],es[512]; str_tree(out,as,sizeof as); str_tree(exp,es,sizeof es); clab_fail(name,es,as);} }
int main(void){
 test_tree("vuoto", NULL);
 test_tree("singolo 1", N(1,NULL,NULL));
 test_tree("singolo 11", N(11,NULL,NULL));
 test_tree("lineare", N(1,N(2,N(3,NULL,NULL),NULL),NULL));
 test_tree("bilanciato piccolo", N(5,N(4,NULL,NULL),N(7,NULL,NULL)));
 test_tree("esempio simile", N(8,N(4,N(5,N(4,NULL,NULL),N(7,NULL,NULL)),N(12,NULL,NULL)),N(2,NULL,N(1,N(13,NULL,NULL),NULL))));
 test_tree("root scartata", N(99,N(1,NULL,NULL),N(2,NULL,NULL)));
 test_tree("sottoalbero scartato", N(1,N(99,N(1,NULL,NULL),NULL),N(2,NULL,NULL)));
 test_tree("duplicati", N(1,N(1,NULL,NULL),N(1,NULL,NULL)));
 test_tree("profondo misto", N(3,N(6,N(9,NULL,NULL),N(10,NULL,NULL)),N(2,N(5,NULL,NULL),N(8,NULL,NULL))));
 clab_summary(); return clab_failed?1:0; }
`;
for (const e of exercises) {
 if (e.id==='2025-esame-16-06-2025-a-esercizio-1') e.tester=tester24;
 if (e.id==='2025-esame-16-06-2025-a-esercizio-2') e.tester=tester25;
 if (e.id==='2025-esame-16-06-2025-a-esercizio-3') e.tester=tester26;
}
await writeFile(path, JSON.stringify(exercises,null,2)+'\n');
console.log('updated 3 testers for exercises 24-26');

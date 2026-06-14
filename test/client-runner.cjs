const { runC } = require('picoc-js');

function buildClientC(data) {
  let code = [data.auxH, data.auxC, data.solution, data.tester].join('\n\n');
  code = code.replace(/^\s*#\s*include\s+"aux\.h"\s*$/gm, '');
  code = code.replace(/^\s*#\s*include\s+<assert\.h>\s*$/gm, '');
  code = code.replace(/assert\s*\(([^;]+)\)\s*;/g, 'if (!($1)) { printf("Assertion failed: $1\\n"); return 1; }');
  return code;
}

const payload = {
  auxH: '#ifndef AUX_H\n#define AUX_H\nint somma(int, int);\n#endif\n',
  auxC: '',
  solution: 'int somma(int a, int b) { return a + b; }\n',
  tester: '#include <stdio.h>\n#include <assert.h>\n#include "aux.h"\nint main(void) { assert(somma(2,3)==5); printf("browser pass\\n"); return 0; }\n'
};

let out = '';
runC(buildClientC(payload), chunk => { out += String(chunk ?? ''); });
setTimeout(() => {
  if (!out.includes('browser pass')) {
    console.error('client runner failed:', JSON.stringify(out));
    process.exit(1);
  }
  console.log('client runner ok:', out.trim());
}, 200);

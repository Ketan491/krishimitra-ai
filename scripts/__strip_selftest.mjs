import { stripByExt } from './strip-comments.mjs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const tslib = 'C:/Users/Nilesh/AppData/Local/Temp/opencode/tslib/node_modules/typescript/lib/typescript.js';
const tsmod = await import('file:///' + tslib.replaceAll('\\', '/'));
const ts = tsmod.default ?? tsmod;

const KIND = { '.ts': ts.ScriptKind.TS, '.tsx': ts.ScriptKind.TSX, '.js': ts.ScriptKind.JS, '.mjs': ts.ScriptKind.JS };

const cases = [
  {
    name: 'url// + line/block comments',
    file: 'x.mjs',
    src: `import x from 'a'; // keep me\n// drop this line\nconst url = 'https://example.com/a?q=1#frag'; // trailing\n/* block\n   comment */\nconst re = /\\/\\/ not a comment/g;\nconst r2 = /^[a-z]\\/[a-z]$/.test('a/b');\nconst t = \`line has // inside\`;\nconst keep = 'end'; // final\n`,
    expectNo: ['keep me', 'drop this line', 'trailing', 'block', 'final'],
    expectYes: ['https://example.com', 'not a comment', 'line has // inside'],
  },
  {
    name: 'tsx jsx and template literal',
    file: 'y.tsx',
    src: `// header\nconst b = 1;\nexport const C = () => (\n  <div title="a///b">{/* inline jsx comment */}<span>{'x // y'}</span></div>\n);\n/** doc */\nexport function f() { return b; }\n`,
    expectNo: ['header', 'inline jsx comment', 'doc'],
    expectYes: ['a///b', 'x // y'],
  },
  {
    name: 'triple-slash reference preserved',
    file: 'z.ts',
    src: `/// <reference lib="es2015" />\n// normal comment\nexport interface Foo { a: string; } // trailing\n`,
    expectNo: ['normal comment', 'trailing'],
    expectYes: ['/// <reference lib="es2015" />'],
  },
  {
    name: 'trailing comments removed, newlines kept',
    file: 'q.js',
    src: `const a = 1; // c1\nconst b = 2; /* c2 */\nconst c = 3;\n`,
    expectNo: ['// c1', '/* c2 */'],
    expectYes: ['const c = 3'],
  },
  {
    name: 'separate-line comments between statements (regression)',
    file: 'r.js',
    src: `const a = 1;\n\n// separate line comment\nfunction f() { return a; }\n\n// another\nconst b = 2; // trailing\n\n/* block between */\nconst d = b;\n`,
    expectNo: ['separate line comment', 'another', 'trailing', 'block between'],
    expectYes: ['return a', 'const d = b'],
  },
];

function syntaxOk(file, text) {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ESNext, true, KIND[path.extname(file)]);
  return sf.parseDiagnostics.length === 0;
}

let ok = true;
for (const c of cases) {
  const res = stripByExt(c.file, c.src);
  const out = res.out;
  console.log('---', c.name, '---');
  console.log(out);
  let pass = true;
  for (const needle of c.expectNo) {
    if (out.includes(needle)) {
      console.log(`  FAIL: should not contain ${JSON.stringify(needle)}`);
      pass = false;
    }
  }
  for (const needle of c.expectYes) {
    if (!out.includes(needle)) {
      console.log(`  FAIL: should contain ${JSON.stringify(needle)}`);
      pass = false;
    }
  }
  const okSyntax = syntaxOk(c.file, out);
  if (!okSyntax) {
    console.log('  SYNTAX ERROR');
    pass = false;
  } else {
    console.log('  syntax OK');
  }
  if (pass) console.log('  PASS');
  else ok = false;
}
console.log(ok ? '\nSELF-TEST PASSED' : '\nSELF-TEST FAILED');
process.exitCode = ok ? 0 : 1;

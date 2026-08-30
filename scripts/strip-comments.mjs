import fs from 'node:fs';
import path from 'node:path';
import url, { pathToFileURL } from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const TS_CANDIDATES = [
  path.join(root, 'frontend/node_modules/typescript/lib/typescript.js'),
  'C:/Users/Nilesh/AppData/Local/Temp/opencode/tslib/node_modules/typescript/lib/typescript.js',
].map((p) => path.resolve(p));

let ts = null;
for (const cand of TS_CANDIDATES) {
  if (fs.existsSync(cand)) {
    const tsModule = await import(pathToFileURL(cand));
    ts = tsModule.default ?? tsModule;
    break;
  }
}
if (!ts) {
  console.error('Could not locate a JS TypeScript install for parsing.');
  process.exit(1);
}

const SKIP_BASENAME = new Set(['package-lock.json', 'package.json']);
const SCRIPT_KIND = {
  '.ts': ts.ScriptKind.TS,
  '.tsx': ts.ScriptKind.TSX,
  '.js': ts.ScriptKind.JS,
  '.mjs': ts.ScriptKind.JS,
  '.jsx': ts.ScriptKind.JSX,
  '.json': ts.ScriptKind.JSON,
};

function stripJs(text, file) {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ESNext, true, SCRIPT_KIND[path.extname(file)]);
  const removals = [];
  let count = 0;

  const lineEnd = (i) => {
    const nl = text.indexOf('\n', i);
    return nl === -1 ? text.length : nl;
  };

  const pushComments = (triviaStart, tokenStart) => {
    let i = triviaStart;
    while (i < tokenStart) {
      if (text[i] === '/' && text[i + 1] === '/') {
        const end = lineEnd(i);
        const lineStart = text.lastIndexOf('\n', i - 1) + 1;
        if (!text.slice(lineStart, end).trimStart().startsWith('/// <reference')) {
          removals.push([i, end]);
          count++;
        }
        i = Math.min(end + 1, tokenStart);
      } else if (text[i] === '/' && text[i + 1] === '*') {
        const close = text.indexOf('*/', i + 2);
        const end = close === -1 ? tokenStart : close + 2;
        removals.push([i, end]);
        count++;
        i = end;
      } else {
        i++;
      }
    }
  };

  const tokens = [];
  const walk = (node) => {
    if (node.pos >= node.end) return;
    if (ts.isToken(node)) {
      tokens.push(node);
      return;
    }
    for (const child of node.getChildren(sf)) walk(child);
  };
  walk(sf);

  for (const t of tokens) pushComments(t.getFullStart(), t.getStart(sf));

  if (removals.length === 0) return { out: text, count: 0 };
  removals.sort((a, b) => b[0] - a[0]);
  let out = text;
  for (const [s, e] of removals) out = out.slice(0, s) + out.slice(e);
  return { out, count };
}

function stripCss(text) {
  const matches = text.match(/\/\*[\s\S]*?\*\//g) ?? [];
  return { out: text.replace(/\/\*[\s\S]*?\*\//g, ''), count: matches.length };
}

function stripHtml(text) {
  const matches = text.match(/<!--[\s\S]*?-->/g) ?? [];
  return { out: text.replace(/<!--[\s\S]*?-->/g, ''), count: matches.length };
}

function stripByExt(file, text) {
  const ext = path.extname(file).toLowerCase();
  if (!['.ts', '.tsx', '.js', '.mjs', '.jsx', '.json', '.css', '.html', '.svg'].includes(ext)) {
    return null;
  }
  if (ext === '.css') return stripCss(text);
  if (ext === '.html' || ext === '.svg') return stripHtml(text);
  return stripJs(text, file);
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.vite') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const roots = [
  path.join(root, 'backend'),
  path.join(root, 'frontend', 'src'),
  path.join(root, 'frontend', 'scripts'),
  path.join(root, 'frontend', 'public'),
  path.join(root, 'frontend', 'vite.config.ts'),
  path.join(root, 'frontend', 'vitest.setup.ts'),
  path.join(root, 'frontend', 'tsconfig.json'),
  path.join(root, 'frontend', 'index.html'),
  path.join(root, 'scripts'),
];

export { stripByExt, stripJs, stripCss, stripHtml };

if (process.argv[1] && path.resolve(process.argv[1]) === url.fileURLToPath(import.meta.url)) {
  const allFiles = [];
  for (const r of roots) {
    if (fs.statSync(r).isDirectory()) allFiles.push(...walk(r));
    else allFiles.push(r);
  }

  let changed = 0;
  let totalRemoved = 0;
  for (const file of allFiles) {
    if (SKIP_BASENAME.has(path.basename(file))) continue;
    const ext = path.extname(file).toLowerCase();
    if (!['.ts', '.tsx', '.js', '.mjs', '.jsx', '.json', '.css', '.html', '.svg'].includes(ext)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (!/[/*]/.test(text) && ext !== '.html' && ext !== '.svg') continue;
    const res = stripByExt(file, text);
    if (!res || res.out === text) continue;
    fs.writeFileSync(file, res.out, 'utf8');
    totalRemoved += res.count;
    changed++;
    console.log(`stripped ${res.count} comment(s): ${file.slice(root.length + 1)}`);
  }

  console.log(`\n${changed} file(s) modified, ${totalRemoved} comment(s) removed.`);
  if (changed === 0) console.log('Nothing to strip — already comment-free.');
}

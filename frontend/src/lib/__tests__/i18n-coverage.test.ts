import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DICTIONARIES, type Language } from '../i18n';

const SRC = join(process.cwd(), 'src');
const EXCLUDE_DIRS = new Set(['__tests__', 'node_modules']);
const EXCLUDE_FILES = new Set(['i18n-extras.ts', 'i18n.ts']);

function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (!EXCLUDE_DIRS.has(name)) out.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(name) && !EXCLUDE_FILES.has(name)) {
      out.push(full);
    }
  }
  return out;
}

function stripComments(content: string): string {
  return content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])[ \t]*\/\/.*$/gm, '$1');
}

function resolveKey(dict: Record<string, unknown>, key: string): unknown {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return node;
}

const DYNAMIC_SETS: Record<string, string[]> = {
  'status.': ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Reviewed', 'Cancelled'],
  'roles.': ['farmer', 'customer', 'admin'],
};

function collectUsedKeys(): Set<string> {
  const keys = new Set<string>();
  for (const file of collectSourceFiles(SRC)) {
    const content = stripComments(readFileSync(file, 'utf8'));

    for (const m of content.matchAll(/translate\(\s*["'`]([^"'`]+)["'`]/g)) {
      const k = m[1];
      if (k.includes('${')) continue;
      if (k.endsWith('.') && DYNAMIC_SETS[k]) {
        for (const s of DYNAMIC_SETS[k]) keys.add(k + s);
        continue;
      }
      keys.add(k);
    }

    for (const m of content.matchAll(/translate\(\s*"([^"]+)"\s*\+\s*\(?[^)]*?["']([A-Za-z0-9-]+)["']/g)) {
      keys.add(m[1] + m[2]);
    }

    for (const m of content.matchAll(/translate\(\s*`([a-z][\w.-]*)\.?\$\{/g)) {
      const prefix = m[1].endsWith('.') ? m[1] : m[1] + '.';
      const suffixes = DYNAMIC_SETS[prefix];
      expect(suffixes, `Unknown dynamic translate prefix \`${m[1]}\` in ${file}`).toBeDefined();
      for (const s of suffixes) keys.add(prefix + s);
    }

    for (const m of content.matchAll(/["'`]([a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+)["'`]/g)) {
      keys.add(m[1]);
    }
  }
  return keys;
}

describe('i18n coverage', () => {
  it('every key used in the app resolves in all three languages', () => {
    const keys = [...collectUsedKeys()].sort();
    expect(keys.length).toBeGreaterThan(100);

    const missing: string[] = [];
    for (const lang of ['en', 'hi', 'mr'] as Language[]) {
      const dict = DICTIONARIES[lang];
      for (const key of keys) {
        const v = resolveKey(dict, key);
        if (typeof v !== 'string' || v.length === 0) {
          missing.push(`${lang}:${key}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('dynamic select label keys resolve', () => {
    const soilOpts = ['Alluvial', 'Black', 'Red', 'Laterite', 'Sandy', 'Clay', 'Loamy'];
    const seasonOpts = ['Kharif', 'Rabi', 'Zaid'];
    const keys: string[] = [
      ...soilOpts.map((s) => `recommend.soil${s}`),
      ...seasonOpts.map((s) => `recommend.season${s}`),
      'recommend.waterIrrigated',
      'recommend.waterRainFed',
      ...soilOpts.map((s) => `cropsDb.soil${s}`),
      ...seasonOpts.map((s) => `cropsDb.season${s}`),
      ...['crop', 'pest', 'price', 'scheme'].map((s) => `chat.suggestion-${s}`),
      'farmer.cropStatusPlanted',
      'farmer.cropStatusGrowing',
      'farmer.cropStatusHarvested',
    ];
    for (const lang of ['en', 'hi', 'mr'] as Language[]) {
      for (const key of keys) {
        expect(resolveKey(DICTIONARIES[lang], key), `${lang}:${key}`).toBeTypeOf('string');
      }
    }
  });
});

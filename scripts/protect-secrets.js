#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname, '..');
const configPath = path.join(rootDir, 'config', 'protected-secrets.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function relPath(filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
}

function resolveRoot(filePath) {
  return path.join(rootDir, filePath);
}

function hashValue(value) {
  return `sha256:${crypto.createHash('sha256').update(String(value), 'utf8').digest('hex')}`;
}

function parseEnvValue(raw) {
  const value = raw.trim();
  if (!value) return '';

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    const quote = value[0];
    const inner = value.slice(1, -1);
    if (quote === '"') {
      try {
        return JSON.parse(value);
      } catch {
        return inner;
      }
    }
    return inner;
  }

  return value.replace(/\s+#.*$/, '').trim();
}

function readEnvItems(config) {
  const items = [];

  for (const fileName of config.envFiles || []) {
    const filePath = resolveRoot(fileName);
    if (!fs.existsSync(filePath)) continue;

    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match) continue;

      const key = match[1];
      const value = parseEnvValue(match[2]);
      if (!value) continue;

      items.push({
        id: `env:${fileName}:${key}`,
        label: `${fileName}:${key}`,
        source: fileName,
        hash: hashValue(value),
      });
    }
  }

  return items;
}

function unescapeJsonString(raw) {
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw;
  }
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readJsoncItems(config) {
  const items = [];

  for (const entry of config.jsoncFiles || []) {
    const filePath = resolveRoot(entry.path);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    for (const key of entry.keys || []) {
      const regex = new RegExp(`"${escapeRegex(key)}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`);
      const match = content.match(regex);
      if (!match || !match[1]) continue;

      items.push({
        id: `jsonc:${entry.path}:${key}`,
        label: `${entry.path}:${key}`,
        source: entry.path,
        hash: hashValue(unescapeJsonString(match[1])),
      });
    }
  }

  return items;
}

function readLiteralItems(config) {
  const items = [];

  for (const entry of config.literalPatterns || []) {
    const filePath = resolveRoot(entry.path);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    const regex = new RegExp(entry.pattern);
    const match = content.match(regex);
    if (!match) continue;

    items.push({
      id: `literal:${entry.path}:${entry.name}`,
      label: `${entry.path}:${entry.name}`,
      source: entry.path,
      hash: hashValue(match[1] || match[0]),
    });
  }

  return items;
}

function uniqueById(items) {
  const seen = new Map();
  for (const item of items) {
    seen.set(item.id, item);
  }
  return [...seen.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function collectItems(config) {
  return uniqueById([
    ...readEnvItems(config),
    ...readJsoncItems(config),
    ...readLiteralItems(config),
  ]);
}

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing ${relPath(configPath)}`);
  }
  return readJson(configPath);
}

function lockPath(config) {
  return resolveRoot(config.lockFile || '.secrets.lock.local');
}

function writeLock(config) {
  const items = collectItems(config);
  if (items.length === 0) {
    throw new Error('No protected values found. Refusing to create an empty secret lock.');
  }

  const target = lockPath(config);
  if (fs.existsSync(target)) {
    fs.chmodSync(target, 0o600);
  }

  const lock = {
    version: 1,
    generatedAt: new Date().toISOString(),
    note: 'Contains hashes only. Refresh only after an intentional key/config change.',
    items,
  };

  fs.writeFileSync(target, `${JSON.stringify(lock, null, 2)}\n`, { mode: 0o600 });
  console.log(`[secrets] Wrote ${relPath(target)} with ${items.length} protected values.`);
}

function compareLock(config) {
  const target = lockPath(config);
  if (!fs.existsSync(target)) {
    throw new Error(`Missing ${relPath(target)}. Run "npm run secrets:lock" after confirming the current keys are correct.`);
  }

  const current = new Map(collectItems(config).map((item) => [item.id, item]));
  const locked = new Map((readJson(target).items || []).map((item) => [item.id, item]));
  const problems = [];

  for (const [id, lockedItem] of locked.entries()) {
    const currentItem = current.get(id);
    if (!currentItem) {
      problems.push(`missing or empty: ${lockedItem.label}`);
      continue;
    }
    if (currentItem.hash !== lockedItem.hash) {
      problems.push(`changed: ${lockedItem.label}`);
    }
  }

  for (const [id, currentItem] of current.entries()) {
    if (!locked.has(id)) {
      problems.push(`new value not locked yet: ${currentItem.label}`);
    }
  }

  if (problems.length > 0) {
    console.error('[secrets] Protected keys/config changed:');
    for (const problem of problems) {
      console.error(`  - ${problem}`);
    }
    console.error('[secrets] If this was intentional, run "npm run secrets:lock" after explicit approval.');
    process.exit(1);
  }

  console.log(`[secrets] OK: ${locked.size} protected values match ${relPath(target)}.`);
}

function setReadOnly(config, readOnly) {
  const files = config.freezeFiles || [];
  for (const fileName of files) {
    const filePath = resolveRoot(fileName);
    if (!fs.existsSync(filePath)) continue;
    fs.chmodSync(filePath, readOnly ? 0o444 : 0o600);
    console.log(`[secrets] ${readOnly ? 'froze' : 'unfroze'} ${fileName}`);
  }
}

function listItems(config) {
  const items = collectItems(config);
  for (const item of items) {
    console.log(item.label);
  }
}

function main() {
  const config = loadConfig();
  const args = new Set(process.argv.slice(2));

  if (args.has('--lock') || args.has('--refresh') || args.has('--init')) {
    writeLock(config);
    return;
  }
  if (args.has('--check')) {
    compareLock(config);
    return;
  }
  if (args.has('--freeze')) {
    compareLock(config);
    setReadOnly(config, true);
    return;
  }
  if (args.has('--unfreeze')) {
    setReadOnly(config, false);
    return;
  }
  if (args.has('--list')) {
    listItems(config);
    return;
  }

  console.log('Usage: node scripts/protect-secrets.js --check|--lock|--freeze|--unfreeze|--list');
}

main();

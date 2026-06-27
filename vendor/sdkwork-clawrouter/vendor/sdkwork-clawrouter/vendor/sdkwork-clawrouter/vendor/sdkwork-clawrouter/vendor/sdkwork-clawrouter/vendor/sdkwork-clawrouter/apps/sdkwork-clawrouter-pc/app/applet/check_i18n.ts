import fs from 'fs';
import path from 'path';

function findMissingKeys() {
  const i18nPath = 'packages/sdkwork-clawrouter-pc-i18n/src/index.ts';
  const i18nContent = fs.readFileSync(i18nPath, 'utf8');

  const { execSync } = require('child_process');

  // Find all matches of t('something' or t("something" in all .tsx files
  const grepCommand = 'grep -rEo "t\\([\'\\"][a-zA-Z0-9_.-]+[\'\\"]" packages/ || true';
  const output = execSync(grepCommand, { encoding: 'utf8' });

  const matches = output.match(/t\(['"]([a-zA-Z0-9_.-]+)['"]/g) || [];
  const keys = new Set(matches.map(m => m.substring(3, m.length - 1)));

  const missing = [];
  for (const key of keys) {
    if (!i18nContent.includes('"' + key + '"')) {
      missing.push(key);
    }
  }

  console.log('MISSING_KEYS:', missing);
}

findMissingKeys();

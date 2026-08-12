// Line-based sync of lockfile catalogs.default specifiers from the
// pnpm-workspace.yaml catalog (authority). pnpm 10.33 does not refresh the
// lockfile catalogs section on yaml edits, so this aligns them manually.
import { readFileSync, writeFileSync } from 'node:fs';

function parseCatalog(yaml) {
  const catalog = {};
  let inCatalog = false;
  for (const line of yaml.split(/\r?\n/u)) {
    if (/^catalog:\s*$/u.test(line)) { inCatalog = true; continue; }
    if (inCatalog && /^[A-Za-z0-9_./-]+:\s*$/u.test(line) && !line.startsWith(' ')) break;
    const m = line.match(/^\s*["']?([^"':]+)["']?\s*:\s*(.+?)\s*$/u);
    if (inCatalog && m) {
      let value = m[2];
      if (value.startsWith('"') && value.endsWith('"')) value = JSON.parse(value);
      catalog[m[1]] = value;
    }
  }
  return catalog;
}

const yaml = readFileSync('pnpm-workspace.yaml', 'utf8');
const catalog = parseCatalog(yaml);

const lines = readFileSync('pnpm-lock.yaml', 'utf8').split(/\r?\n/u);
let count = 0;
for (let i = 0; i < lines.length - 1; i += 1) {
  const keyMatch = lines[i].match(/^    (["']?)([^"':]+)\1:$/u);
  if (!keyMatch) continue;
  if (!lines[i + 1].trimStart().startsWith('specifier:')) continue;
  const key = keyMatch[2];
  if (!(key in catalog)) continue;
  lines[i + 1] = '      specifier: ' + catalog[key];
  count += 1;
}
writeFileSync('pnpm-lock.yaml', lines.join('\r\n') + '\r\n', 'utf8');
console.log('lockfile catalogs specifiers synced:', count);

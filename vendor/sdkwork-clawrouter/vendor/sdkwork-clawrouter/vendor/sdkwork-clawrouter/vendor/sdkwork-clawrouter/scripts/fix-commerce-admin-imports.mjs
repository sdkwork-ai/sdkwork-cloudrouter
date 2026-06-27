import fs from 'node:fs';
import path from 'node:path';

const packages = [
  'sdkwork-clawrouter-pc-admin-announcement',
  'sdkwork-clawrouter-pc-admin-catalog',
  'sdkwork-clawrouter-pc-admin-finance',
  'sdkwork-clawrouter-pc-admin-inventory',
  'sdkwork-clawrouter-pc-admin-marketing',
  'sdkwork-clawrouter-pc-admin-memberships',
  'sdkwork-clawrouter-pc-admin-oauth',
  'sdkwork-clawrouter-pc-admin-orders',
  'sdkwork-clawrouter-pc-admin-payments',
  'sdkwork-clawrouter-pc-admin-service-provider',
  'sdkwork-clawrouter-pc-admin-wallet',
];

function walk(dir, changed) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, changed);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) {
      continue;
    }
    const before = fs.readFileSync(fullPath, 'utf8');
    const after = before.replaceAll('sdkwork-clawroutes-pc-commons', '@sdkwork/clawroutes-pc-commons');
    if (after !== before) {
      fs.writeFileSync(fullPath, after, 'utf8');
      changed.push(fullPath);
    }
  }
}

const changed = [];
for (const pkg of packages) {
  const srcRoot = path.join('apps/sdkwork-clawrouter-pc/packages', pkg, 'src');
  if (fs.existsSync(srcRoot)) {
    walk(srcRoot, changed);
  }
}

console.log(`updated ${changed.length} source files`);

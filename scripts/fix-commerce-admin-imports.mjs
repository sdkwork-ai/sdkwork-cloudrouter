import fs from 'node:fs';
import path from 'node:path';

const packages = [
  'sdkwork-cloudrouter-pc-admin-announcement',
  'sdkwork-cloudrouter-pc-admin-catalog',
  'sdkwork-cloudrouter-pc-admin-finance',
  'sdkwork-cloudrouter-pc-admin-inventory',
  'sdkwork-cloudrouter-pc-admin-marketing',
  'sdkwork-cloudrouter-pc-admin-memberships',
  'sdkwork-cloudrouter-pc-admin-oauth',
  'sdkwork-cloudrouter-pc-admin-orders',
  'sdkwork-cloudrouter-pc-admin-payments',
  'sdkwork-cloudrouter-pc-admin-service-provider',
  'sdkwork-cloudrouter-pc-admin-wallet',
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
    const after = before.replaceAll('sdkwork-cloudroutes-pc-commons', '@sdkwork/cloudroutes-pc-commons');
    if (after !== before) {
      fs.writeFileSync(fullPath, after, 'utf8');
      changed.push(fullPath);
    }
  }
}

const changed = [];
for (const pkg of packages) {
  const srcRoot = path.join('apps/sdkwork-cloudrouter-pc/packages', pkg, 'src');
  if (fs.existsSync(srcRoot)) {
    walk(srcRoot, changed);
  }
}

console.log(`updated ${changed.length} source files`);

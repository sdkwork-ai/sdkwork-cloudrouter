// Scan gateway-linked route manifests for auth inconsistencies:
//   manifest public routes whose OpenAPI contract requires credentials (40001 risk)
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const space = 'E:/sdkwork-space';

const ROUTE_CRATES = [
  ['sdkwork-account', 'sdkwork-routes-account-app-api'],
  ['sdkwork-appbase', 'sdkwork-routes-base-data-backend-api'],
  ['sdkwork-appbase', 'sdkwork-routes-edu-data-backend-api'],
  ['sdkwork-appbase', 'sdkwork-routes-med-data-backend-api'],
  ['sdkwork-catalog', 'sdkwork-routes-catalog-app-api'],
  ['sdkwork-catalog', 'sdkwork-routes-catalog-backend-api'],
  ['sdkwork-cloudrouter', 'sdkwork-routes-cloudrouter-app-api'],
  ['sdkwork-cloudrouter', 'sdkwork-routes-cloudrouter-backend-api'],
  ['sdkwork-iam', 'sdkwork-routes-iam-app-api'],
  ['sdkwork-iam', 'sdkwork-routes-iam-backend-api'],
  ['sdkwork-invoice', 'sdkwork-routes-invoice-app-api'],
  ['sdkwork-membership', 'sdkwork-routes-membership-app-api'],
  ['sdkwork-models', 'sdkwork-routes-models-catalog-app-api'],
  ['sdkwork-models', 'sdkwork-routes-models-catalog-backend-api'],
  ['sdkwork-partner', 'sdkwork-routes-partner-backend-api'],
  ['sdkwork-payment', 'sdkwork-routes-payment-app-api'],
  ['sdkwork-promotion', 'sdkwork-routes-promotion-app-api'],
  ['sdkwork-promotion', 'sdkwork-routes-promotion-backend-api'],
  ['sdkwork-shop', 'sdkwork-routes-shop-app-api'],
];

function findManifestFile(crateDir) {
  for (const name of ['http_route_manifest.rs', 'manifest.rs']) {
    const p = path.join(crateDir, 'src', name);
    if (existsSync(p)) return p;
  }
  // search src recursively for route manifest definitions
  const srcDir = path.join(crateDir, 'src');
  if (!existsSync(srcDir)) return null;
  const found = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.rs')) {
        try {
          const t = readFileSync(p, 'utf8');
          if (t.includes('HttpRouteManifest') && /HttpRoute::(public|dual_token)/.test(t)) found.push(p);
        } catch {}
      }
    }
  };
  walk(srcDir);
  return found[0] || null;
}

function parseManifest(file) {
  const text = readFileSync(file, 'utf8');
  const routes = [];
  const authRe = /(?:[A-Za-z_]+::)?(public|dual_token|bootstrap_body|api_key|oauth|ingress_token|refresh_token|agent_token|compatibility|open_api_flexible|open_api_bearer_flexible|credential_entry_bootstrap)\(/;
  const pathRe = /"(\/(?:app|backend|gateway|internal|open|im)\/v\d[^"]*)"/;
  const methodRe = /HttpMethod::(Get|Post|Put|Patch|Delete|Options)/;
  let pendingAuth = null;
  let pendingMethod = null;
  for (const line of text.split('\n')) {
    const a = line.match(authRe);
    if (a) { pendingAuth = a[1]; pendingMethod = null; continue; }
    const meth = line.match(methodRe);
    if (meth && pendingAuth) { pendingMethod = meth[1]; continue; }
    const p = line.match(pathRe);
    if (p && pendingAuth && pendingMethod) {
      routes.push({ auth: pendingAuth, method: pendingMethod, path: p[1] });
      pendingAuth = null; pendingMethod = null;
    }
  }
  return routes;
}

function findContracts(repoDir, crateName) {
  const contracts = [];
  const surface = crateName.replace(/^sdkwork-routes-/, '');
  const scan = (dir, depth) => {
    if (depth > 3) return;
    let entries = [];
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (['node_modules', 'target', '.git', 'generated'].includes(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) scan(p, depth + 1);
      else if (e.name.endsWith('.openapi.json') && e.name.includes(surface.split('-').slice(0, 2).join('-') + '-api')) {
        contracts.push(p);
      }
    }
  };
  scan(path.join(space, repoDir, 'apis'), 0);
  return contracts;
}

let publicReport = [];
for (const [repoDir, crate] of ROUTE_CRATES) {
  const crateDir = path.join(space, repoDir, 'crates', crate);
  const manifestFile = findManifestFile(crateDir);
  if (!manifestFile) {
    console.log(`[NOMANIFEST] ${crate} (no manifest.rs/http_route_manifest.rs found)`);
    continue;
  }
  const routes = parseManifest(manifestFile);
  const publicRoutes = routes.filter((r) => r.auth === 'public');
  if (publicRoutes.length === 0) continue;

  const contracts = findContracts(repoDir, crate);
  const specs = contracts.map((f) => {
    try { return { file: f, spec: JSON.parse(readFileSync(f, 'utf8')) }; } catch { return null; }
  }).filter(Boolean);

  for (const r of publicRoutes) {
    const matches = specs.filter(({ spec }) => spec.paths?.[r.path]?.[r.method.toLowerCase()]);
    if (matches.length === 0) {
      publicReport.push({ crate, path: r.path, method: r.method, issue: 'NO_CONTRACT_MATCH' });
      continue;
    }
    for (const { file, spec } of matches) {
      const sec = spec.paths[r.path][r.method.toLowerCase()].security;
      const anon = spec.paths[r.path][r.method.toLowerCase()]['x-sdkwork-auth-mode'];
      if (Array.isArray(sec) && sec.length > 0) {
        publicReport.push({ crate, path: r.path, method: r.method, issue: 'PUBLIC_BUT_CONTRACT_AUTH', security: JSON.stringify(sec), contract: path.basename(file) });
      } else if (anon && anon !== 'anonymous') {
        publicReport.push({ crate, path: r.path, method: r.method, issue: 'PUBLIC_BUT_AUTH_MODE', authMode: anon, contract: path.basename(file) });
      }
    }
  }
}

console.log('===== MANIFEST PUBLIC vs CONTRACT =====');
for (const r of publicReport) {
  console.log(`[${r.issue}] ${r.crate} ${r.method} ${r.path}${r.security ? ' security=' + r.security : ''}${r.authMode ? ' auth-mode=' + r.authMode : ''}${r.contract ? ' (contract: ' + r.contract + ')' : ''}`);
}
console.log(`\n总计: ${publicReport.length} 条 public 声明待核`);

// ===== 2. CONTRACT OPERATIONS MISSING FROM MANIFEST (40101 risk) =====
console.log('\n===== CONTRACT OPERATIONS MISSING FROM MANIFEST =====');
let missingTotal = 0;
for (const [repoDir, crate] of ROUTE_CRATES) {
  const crateDir = path.join(space, repoDir, 'crates', crate);
  const manifestFile = findManifestFile(crateDir);
  if (!manifestFile) continue;
  const routes = parseManifest(manifestFile);
  const manifestPaths = new Set(routes.map((r) => `${r.method.toUpperCase()} ${r.path}`));
  const contracts = findContracts(repoDir, crate);
  const seen = new Set();
  for (const f of contracts) {
    let spec;
    try { spec = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
    for (const [p, item] of Object.entries(spec.paths || {})) {
      for (const [m, op] of Object.entries(item)) {
        if (!['get','post','put','patch','delete'].includes(m)) continue;
        const key = `${m.toUpperCase()} ${p}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (!manifestPaths.has(key)) {
          missingTotal += 1;
          if (missingTotal <= 60) console.log(`[MISSING] ${crate} ${key} ${op.operationId || ''}`);
        }
      }
    }
  }
}
console.log(`\n缺失路由总计: ${missingTotal} 条`);

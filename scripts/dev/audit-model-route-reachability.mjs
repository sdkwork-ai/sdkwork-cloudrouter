#!/usr/bin/env node
/**
 * Per-model official-account route reachability audit.
 *
 * Answers: for every routable model in the sdkwork-models catalog, can a call
 * actually land on the corresponding official account route?
 *
 * ---------------------------------------------------------------------------
 * The runtime gate (measured, not assumed)
 * ---------------------------------------------------------------------------
 * `model_catalog_import.rs` binds EVERY model to a vendor-agnostic
 * `api_endpoint` derived solely from the model's `primaryCapability`:
 *
 *   capability   endpoint_code             protocol
 *   ----------   -----------------------   -----------------
 *   (chat)       openai.chat_completions   openai_compatible
 *   embedding    openai.embeddings         openai_compatible
 *   image        openai.images             openai_compatible
 *   audio        openai.audio              openai_compatible
 *   video        openai.video              openai_compatible
 *   music        suno.music                vendor_native
 *   rerank       rerank                    vendor_native
 *
 * Verified on the live dev DB, e.g.
 *   xai/grok-4.5              -> openai.chat_completions
 *   minimax/hailuo-2.3        -> openai.video
 *   kuaishou/kling-v3         -> openai.video
 *   elevenlabs/music_v2       -> suno.music
 *
 * So per-model reachability is NOT gated by the model's own vendor's native
 * endpoint. It is gated by whether the request's account group is GRANTED the
 * generic endpoint resource (`ai_resource.resource_code` that the endpoint maps
 * to), and whether that group holds a callable ENABLED account.
 *
 * The audit therefore resolves:
 *   1. model.primaryCapability -> generic endpoint_code
 *   2. endpoint_code -> ai_resource.resource_code
 *   3. is that resource granted to the default group? (directly, or via a
 *      resource group the default group holds)
 *   4. does the default group hold an enabled account with base_url+credential
 *      whose (server-side) vendor can reach that endpoint?
 *
 * Stage 3 is evaluated against the LIVE database when a DSN is available
 * (`--dsn` or $SDKWORK_DATABASE_URL), otherwise against the bundled seed
 * (`data/ai-routing/**`). Pass `--seed-only` to force the bundled view.
 *
 * Usage:
 *   node scripts/dev/audit-model-route-reachability.mjs
 *   node scripts/dev/audit-model-route-reachability.mjs --list-gaps
 *   node scripts/dev/audit-model-route-reachability.mjs --by-capability
 *   node scripts/dev/audit-model-route-reachability.mjs --dsn "postgres://..." --json out.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const modelsRoot =
  process.env.SDKWORK_MODELS_ROOT ?? 'D:/sdkwork-space/sdkwork-models';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

// ---------------------------------------------------------------------------
// 1. Catalog models (deduped by routing identity)
// ---------------------------------------------------------------------------
function collectModelFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.json') && path.basename(d) === 'models')
        out.push(p);
    }
  };
  walk(dir);
  return out;
}

const isRoutable = (m) =>
  m.routingState === 'enabled' ||
  m.shelfState === 'listed' ||
  m.releaseStage === 'active';

// `catalog_key` (vendor/model) is the routing identity; the same model is
// legitimately declared once per region (cn + global) so files double-count.
const byCatalogKey = new Map();
for (const file of collectModelFiles(path.join(modelsRoot, 'models'))) {
  const raw = readJson(file);
  if (!isRoutable(raw)) continue;
  const catalogKey = raw.catalogKey ?? `${raw.vendorCode}/${raw.modelId}`;
  const existing = byCatalogKey.get(catalogKey);
  if (existing) {
    if (raw.regionCode) existing.regions.add(raw.regionCode);
    existing.files.push(path.relative(repoRoot, file));
    continue;
  }
  byCatalogKey.set(catalogKey, {
    catalogKey,
    vendorCode: raw.vendorCode,
    modelId: raw.modelId,
    regions: new Set(raw.regionCode ? [raw.regionCode] : []),
    apiFormat: raw.apiFormat ?? null,
    capabilities: raw.capabilities ?? [],
    primaryCapability: raw.primaryCapability ?? null,
    inputModalities: raw.inputModalities ?? [],
    outputModalities: raw.outputModalities ?? [],
    files: [path.relative(repoRoot, file)],
  });
}
const routable = [...byCatalogKey.values()];

// ---------------------------------------------------------------------------
// 2. Bundled seed: generic endpoints, resource groups, default-group grants
// ---------------------------------------------------------------------------
const seedRoot = path.join(repoRoot, 'data', 'ai-routing');
const manifest = readJson(path.join(seedRoot, 'install-manifest.json'));

const resources = new Map();
for (const rel of manifest.sections.resources) {
  for (const item of readJson(path.join(seedRoot, 'resources', rel)).items ?? []) {
    resources.set(item.resourceCode, item);
  }
}

const seedGroups = new Map();
for (const rel of manifest.sections.resourceGroups) {
  for (const g of readJson(path.join(seedRoot, 'resource-groups', rel)).items ?? []) {
    seedGroups.set(g.groupCode, (g.items ?? []).map((i) => i.resourceCode));
  }
}

// Mirrors `model_catalog_import::endpoint_descriptor_for_model`.
// endpoint_code -> the resource_code the import binds the model to.
const GENERIC_ENDPOINT_RESOURCE = {
  'chat': ['openai.chat_completions', 'api.openai.chat_completions', 'llm'],
  'embedding': ['openai.embeddings', 'api.openai.embeddings', 'embedding'],
  'image': ['openai.images', 'api.openai.images', 'image'],
  'audio': ['openai.audio', 'api.openai.audio', 'audio'],
  'video': ['openai.video', 'api.openai.video', 'video'],
  'music': ['suno.music', 'api.suno.music', 'music'],
  'rerank': ['rerank', 'api.rerank', 'rerank'],
};

// primaryCapability aliases seen in the catalog -> generic endpoint family.
const PRIMARY_TO_FAMILY = {
  chat: 'chat', llm: 'chat', text: 'chat', reasoning: 'chat', code: 'chat',
  coding: 'chat', responses: 'chat',
  embedding: 'embedding', embeddings: 'embedding',
  image: 'image', video: 'video', audio: 'audio', speech: 'audio', sfx: 'audio',
  music: 'music', rerank: 'rerank', reranking: 'rerank',
};

// The default group's grants. Mirrors
// `DefaultAdminUpstreamAccountGroupSeed::resource_group_codes`:
// primary + DEFAULT_GROUP_EXTRA_RESOURCE_GROUP_CODES + every
// VENDOR_RESOURCE_GROUP_BINDINGS value (deduped).
//
// Both variable parts are parsed straight out of `ai_routing_seed.rs` rather
// than transcribed, because a transcribed copy drifts silently the moment a
// vendor is added: the audit would keep reporting 100 % reachable while the
// live default group had genuinely lost (or never gained) a grant. Parsing the
// source means the audit can only ever disagree with the seed if the seed's own
// syntax changes, which the unit tests catch first.
const SEED_SOURCE = path.join(
  repoRoot,
  'services',
  'sdkwork-cloudrouter-router-service',
  'src',
  'infrastructure',
  'sql',
  'ai_routing_seed.rs',
);

function rustArrayStringLiterals(source, declaration) {
  const start = source.indexOf(declaration);
  if (start < 0) {
    throw new Error(
      `audit: could not find \`${declaration}\` in ai_routing_seed.rs — the seed was ` +
        'reshaped; update the audit parser rather than guessing the grants',
    );
  }
  const open = source.indexOf('[', start);
  const end = source.indexOf('];', open);
  const body = source.slice(open, end < 0 ? source.length : end);
  return [...body.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

function defaultGroupGrantCodes() {
  const source = fs.readFileSync(SEED_SOURCE, 'utf8');

  // The default group's primary grant is an inline literal on
  // `default_admin_upstream_account_group`, not a named constant.
  const primaryAnchor = source.indexOf('fn default_admin_upstream_account_group()');
  if (primaryAnchor < 0) {
    throw new Error(
      'audit: `default_admin_upstream_account_group` is gone from ai_routing_seed.rs — ' +
        'update the audit parser rather than guessing the default group grants',
    );
  }
  const primaryBlock = source.slice(primaryAnchor, primaryAnchor + 1200);
  const primaryMatch = /resource_group_code:\s*"([^"]+)"/.exec(primaryBlock);
  if (!primaryMatch) {
    throw new Error(
      'audit: could not read the default group primary `resource_group_code` — ' +
        'update the audit parser',
    );
  }

  const extra = rustArrayStringLiterals(
    source,
    'const DEFAULT_GROUP_EXTRA_RESOURCE_GROUP_CODES',
  );
  // `VENDOR_RESOURCE_GROUP_BINDINGS` is a list of (vendor, group) pairs, so
  // half its literals are vendor codes. Keep only names that resolve to a seed
  // group, which drops the vendor half without hard-coding which is which.
  const vendorGroups = rustArrayStringLiterals(
    source,
    'const VENDOR_RESOURCE_GROUP_BINDINGS',
  ).filter((code) => seedGroups.has(code));

  return [...new Set([primaryMatch[1], ...extra, ...vendorGroups])];
}

const DEFAULT_GROUP_GRANTS = defaultGroupGrantCodes();

// ---------------------------------------------------------------------------
// 3. Live DB view (authoritative when reachable)
// ---------------------------------------------------------------------------
function psql(dsn, sql) {
  const out = execFileSync(
    'wsl.exe',
    [
      '-d', 'Ubuntu-22.04', '--', 'bash', '-lc',
      `PGPASSWORD=${dsn.password} psql -h ${dsn.host} -p ${dsn.port} -U ${dsn.user} -d ${dsn.database} -t -A -F'|' -c ${JSON.stringify(sql)}`,
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split('|'));
}

function readDevDsn() {
  if (flag('--seed-only')) return null;
  const explicit = opt('--dsn') ?? process.env.SDKWORK_DATABASE_URL;
  if (explicit) {
    try {
      const u = new URL(explicit);
      return {
        host: u.hostname, port: u.port || '5432',
        user: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
        database: u.pathname.replace(/^\//, ''),
      };
    } catch { /* fall through */ }
  }
  const envFile = path.join(repoRoot, '.env.postgres');
  if (!fs.existsSync(envFile)) return null;
  const env = {};
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (m) env[m[1]] = m[2].trim();
  }
  if (!env.SDKWORK_DATABASE_PASSWORD) return null;
  return {
    host: env.SDKWORK_DATABASE_HOST ?? '127.0.0.1',
    port: env.SDKWORK_DATABASE_PORT ?? '5432',
    user: env.SDKWORK_DATABASE_USERNAME,
    password: env.SDKWORK_DATABASE_PASSWORD,
    database: env.SDKWORK_DATABASE_NAME,
  };
}

let live = null;
const dsn = readDevDsn();
if (dsn) {
  try {
    const defaultGroupId = psql(
      dsn,
      "SELECT id FROM ai_upstream_account_group WHERE group_code='default-group' AND deleted_at IS NULL LIMIT 1",
    )[0]?.[0];
    if (defaultGroupId) {
      // Directly granted resource codes (grant_type='allow').
      const grantedResources = new Set(
        psql(
          dsn,
          `SELECT resource_code FROM ai_resource_binding WHERE account_group_id=${defaultGroupId} AND binding_scope='account_group' AND grant_type='allow' AND resource_code IS NOT NULL AND deleted_at IS NULL`,
        ).map((r) => r[0]),
      );
      const grantedGroups = psql(
        dsn,
        `SELECT resource_group_code FROM ai_resource_binding WHERE account_group_id=${defaultGroupId} AND binding_scope='account_group' AND grant_type='allow' AND resource_group_code IS NOT NULL AND deleted_at IS NULL`,
      ).map((r) => r[0]);
      // Expand each granted resource group into its member resource codes.
      const gset = grantedGroups.map((g) => `'${g}'`).join(',');
      const groupMembers = gset
        ? psql(
            dsn,
            `SELECT i.resource_code FROM ai_resource_group_item i JOIN ai_resource_group g ON g.id=i.resource_group_id WHERE g.group_code IN (${gset}) AND i.deleted_at IS NULL`,
          ).map((r) => r[0])
        : [];
      for (const code of groupMembers) grantedResources.add(code);
      // Enabled accounts bound to the default group.
      const accounts = psql(
        dsn,
        `SELECT a.account_code, s.supplier_code, a.status FROM ai_upstream_account_group_member m JOIN ai_upstream_account a ON a.id=m.account_id AND a.deleted_at IS NULL JOIN ai_upstream_supplier s ON s.id=a.supplier_id WHERE m.account_group_id=${defaultGroupId} AND m.enabled AND m.deleted_at IS NULL ORDER BY a.account_code`,
      );
      // Resource -> groups it belongs to (for explaining the grant path).
      const resourceGroups = new Map();
      for (const [rc, gc] of psql(
        dsn,
        `SELECT i.resource_code, g.group_code FROM ai_resource_group_item i JOIN ai_resource_group g ON g.id=i.resource_group_id WHERE i.deleted_at IS NULL`,
      )) {
        if (!resourceGroups.has(rc)) resourceGroups.set(rc, new Set());
        resourceGroups.get(rc).add(gc);
      }
      // Active per-model endpoint binding. The binding is *not* a pure function
      // of `primaryCapability`: an image model is bound to its vendor's native
      // surface (`gemini.image_generation`, `kling.image_generation`,
      // `runway.image_generation`, …) when that vendor publishes one, and to
      // `openai.images` otherwise. Reading the live row is the only way to tell
      // which happened, so the coverage table below does not have to guess.
      const modelBindings = new Map();
      for (const [key, ep] of psql(
        dsn,
        `SELECT me.catalog_key, me.endpoint_code FROM ai_model_api_endpoint me WHERE me.status = 1 AND me.deleted_at IS NULL AND me.endpoint_code IS NOT NULL`,
      )) {
        modelBindings.set(key, ep);
      }
      live = {
        defaultGroupId,
        grantedResources,
        grantedGroups: new Set(grantedGroups),
        accounts: accounts.map(([code, supplier, status]) => ({
          accountCode: code, supplierCode: supplier, status: Number(status),
        })),
        resourceGroups,
        modelBindings,
      };
    }
  } catch (error) {
    console.error(`[warn] live DB probe failed, falling back to bundled seed: ${error.message}`);
  }
}

function seedGrantSet() {
  const set = new Set();
  for (const g of DEFAULT_GROUP_GRANTS) {
    for (const code of seedGroups.get(g) ?? []) set.add(code);
  }
  return set;
}

const view = live
  ? { source: 'live-db', grantedResources: live.grantedResources, grantedGroups: live.grantedGroups }
  : { source: 'bundled-seed', grantedResources: seedGrantSet(), grantedGroups: new Set(DEFAULT_GROUP_GRANTS) };

const callableAccounts = live
  ? live.accounts.filter((a) => a.status === 1)
  : [];

// ---------------------------------------------------------------------------
// 4. Evaluate
// ---------------------------------------------------------------------------
const rows = routable.map((model) => {
  const primary = String(model.primaryCapability ?? '').toLowerCase();
  const family = PRIMARY_TO_FAMILY[primary] ?? null;
  const [endpointCode, resourceCode, familyName] = family
    ? GENERIC_ENDPOINT_RESOURCE[family]
    : [null, null, null];

  const granted = resourceCode ? view.grantedResources.has(resourceCode) : false;
  const owningGroups = resourceCode
    ? [...(live?.resourceGroups.get(resourceCode) ?? new Set())]
    : [];

  let reason = null;
  if (!family) reason = 'NO_GENERIC_ENDPOINT_FOR_PRIMARY_CAPABILITY';
  else if (!granted) reason = 'DEFAULT_GROUP_NOT_GRANTED_GENERIC_ENDPOINT';

  return {
    ...model,
    regionCode: [...model.regions].sort().join('+') || 'global',
    primaryFamily: family,
    endpointCode,
    resourceCode,
    owningResourceGroups: owningGroups,
    grantedToDefaultGroup: granted,
    // The endpoint the model is *actually* bound to (live only). When this
    // differs from the capability fallback above, the vendor published a native
    // surface and the binding took it.
    boundEndpointCode: live?.modelBindings.get(model.catalogKey) ?? null,
    reachable: reason === null,
    reason,
  };
});

// ---------------------------------------------------------------------------
// 5. Report
// ---------------------------------------------------------------------------
const reachableCount = rows.filter((r) => r.reachable).length;
const reasonCounts = new Map();
for (const r of rows) {
  if (r.reachable) continue;
  reasonCounts.set(r.reason, (reasonCounts.get(r.reason) ?? 0) + 1);
}

console.log('='.repeat(78));
console.log('PER-MODEL OFFICIAL-ACCOUNT ROUTE REACHABILITY');
console.log('='.repeat(78));
console.log(`grant view             : ${view.source}`);
console.log(`default group grants   : ${view.grantedResources.size} resource codes`);
console.log(`callable accounts      : ${callableAccounts.length}${live ? '' : ' (seed view: accounts checked in live mode)'}`);
console.log(`routable models        : ${rows.length}`);
console.log(`reachable              : ${reachableCount}`);
console.log(`not reachable          : ${rows.length - reachableCount}`);
console.log();

if (reasonCounts.size) {
  console.log('--- not reachable by reason ---');
  for (const [reason, n] of [...reasonCounts].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${reason}`);
  }
  console.log();
}

console.log('--- endpoint binding (live rows when available, else capability fallback) ---');
for (const [family, [ep, rc]] of Object.entries(GENERIC_ENDPOINT_RESOURCE)) {
  const inFamily = rows.filter((r) => r.primaryFamily === family);
  if (!inFamily.length) continue;
  const granted = view.grantedResources.has(rc);
  const owners = live
    ? [...(live.resourceGroups.get(rc) ?? new Set())]
    : [...seedGroups.entries()].filter(([, v]) => v.includes(rc)).map(([k]) => k);
  console.log(
    `  ${String(inFamily.length).padStart(4)} models  primary=${family.padEnd(9)} fallback=${ep.padEnd(22)} resource=${rc.padEnd(26)} grant=${granted ? 'YES' : 'NO '} groups=[${owners.join(', ') || 'NONE'}]`,
  );
  // Split the family by the endpoint each model is actually bound to. With no
  // live DB every model is reported under the fallback, which is the honest
  // answer for a seed-only run.
  const byEndpoint = new Map();
  for (const r of inFamily) {
    const actual = r.boundEndpointCode ?? ep;
    if (!byEndpoint.has(actual)) byEndpoint.set(actual, []);
    byEndpoint.get(actual).push(r);
  }
  for (const [actual, list] of [...byEndpoint].sort((a, b) => b[1].length - a[1].length)) {
    const native = actual !== ep;
    console.log(
      `         ${String(list.length).padStart(4)} of those bound to ${actual}${native ? '   <== vendor-native' : ''}`,
    );
  }
}
console.log();

if (flag('--by-capability')) {
  console.log('--- per (vendor, primaryCapability) ---');
  const keyed = new Map();
  for (const r of rows) {
    const k = `${r.vendorCode}  ${r.primaryCapability}`;
    if (!keyed.has(k)) keyed.set(k, []);
    keyed.get(k).push(r);
  }
  for (const [k, list] of [...keyed].sort()) {
    const ok = list.filter((r) => r.reachable).length;
    console.log(
      `  ${k.padEnd(40)} n=${String(list.length).padStart(3)} ok=${String(ok).padStart(3)}${ok === list.length ? '' : '   <== GAP  ' + list[0].reason}`,
    );
  }
  console.log();
}

if (flag('--list-gaps')) {
  console.log('--- gaps ---');
  for (const r of rows.filter((x) => !x.reachable)) {
    console.log(
      `  ${String(r.reason).padEnd(42)} ${r.vendorCode.padEnd(20)} ${r.catalogKey.padEnd(46)} primary=${r.primaryCapability} -> ${r.resourceCode}`,
    );
  }
  console.log();
}

const jsonOut = opt('--json');
if (jsonOut) {
  fs.writeFileSync(
    jsonOut,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        modelsRoot,
        grantView: view.source,
        grantedResourceCount: view.grantedResources.size,
        callableAccounts,
        totals: {
          routable: rows.length,
          reachable: reachableCount,
          notReachable: rows.length - reachableCount,
        },
        reasons: Object.fromEntries(reasonCounts),
        rows: rows.map((r) => ({ ...r, regions: [...r.regions] })),
      },
      null,
      2,
    ),
  );
  console.log(`wrote ${jsonOut}`);
}

process.exitCode = reachableCount === rows.length ? 0 : 1;

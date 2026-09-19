#!/usr/bin/env node
// Diagnostic: evaluate each clause of `postgres_ai_routing_seed_complete`
// against the live dev database, so an `UpgradeRequired` names the failing
// predicate instead of only its class.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

function readEnv() {
  const text = fs.readFileSync(path.join(repoRoot, '.env.postgres'), 'utf8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = readEnv();
// The dev database lives in WSL; the Windows side has no psql client.
const oneLine = (sql) => sql.replace(/\s*\n\s*/g, ' ').trim();

function psql(sql) {
  const args = [
    '-d', 'Ubuntu-22.04', '--', 'bash', '-lc',
    `PGPASSWORD=${env.SDKWORK_DATABASE_PASSWORD} psql -h ${env.SDKWORK_DATABASE_HOST} `
      + `-p ${env.SDKWORK_DATABASE_PORT} -U ${env.SDKWORK_DATABASE_USERNAME} `
      + `-d ${env.SDKWORK_DATABASE_NAME} -tAX -F'|' -c ${JSON.stringify(oneLine(sql))}`,
  ];
  return execFileSync('wsl.exe', args, { encoding: 'utf8', timeout: 120000 }).trim();
}

function one(sql) {
  const out = psql(sql);
  return out.split('\n')[0] ?? '';
}

// --- Expected sets, parsed from the bundled seed JSON ------------------------

const seedRoot = path.join(repoRoot, 'data', 'ai-routing');
const manifest = JSON.parse(fs.readFileSync(path.join(seedRoot, 'install-manifest.json'), 'utf8'));

const expectedResources = new Set();
for (const rel of manifest.sections.resources) {
  for (const item of JSON.parse(fs.readFileSync(path.join(seedRoot, 'resources', rel), 'utf8')).items ?? []) {
    expectedResources.add(item.resourceCode);
  }
}
const expectedGroups = new Set();
let expectedGroupItems = 0;
for (const rel of manifest.sections.resourceGroups) {
  for (const g of JSON.parse(fs.readFileSync(path.join(seedRoot, 'resource-groups', rel), 'utf8')).items ?? []) {
    expectedGroups.add(g.groupCode);
    expectedGroupItems += (g.items ?? []).length;
  }
}
const expectedEndpoints = new Set();
for (const rel of manifest.sections.resources) {
  for (const item of JSON.parse(fs.readFileSync(path.join(seedRoot, 'resources', rel), 'utf8')).items ?? []) {
    if (item.resourceType === 'api_endpoint' && item.apiCode) expectedEndpoints.add(item.apiCode);
  }
}

// --- Live sets --------------------------------------------------------------

const liveResources = new Set(
  psql(`SELECT resource_code FROM ai_resource WHERE tenant_id = 0 AND organization_id = 0 AND status = 1 AND deleted_at IS NULL`).split('\n').filter(Boolean),
);
const liveGroups = new Set(
  psql(`SELECT group_code FROM ai_resource_group WHERE tenant_id = 0 AND organization_id = 0 AND status = 1 AND deleted_at IS NULL`).split('\n').filter(Boolean),
);
const liveEndpoints = new Set(
  psql(`SELECT endpoint_code FROM ai_api_endpoint WHERE tenant_id = 0 AND organization_id = 0 AND status = 1 AND deleted_at IS NULL`).split('\n').filter(Boolean),
);
const liveGroupItemCount = Number(
  one(`SELECT count(*) FROM ai_resource_group_item WHERE tenant_id = 0 AND organization_id = 0 AND status = 1 AND deleted_at IS NULL`),
);

const diff = (expected, live) => [...expected].filter((x) => !live.has(x)).sort();

const report = {
  resources: { expected: expectedResources.size, live: liveResources.size, missing: diff(expectedResources, liveResources) },
  groups: { expected: expectedGroups.size, live: liveGroups.size, missing: diff(expectedGroups, liveGroups) },
  endpoints: { expected: expectedEndpoints.size, live: liveEndpoints.size, missing: diff(expectedEndpoints, liveEndpoints) },
  groupItems: { expected: expectedGroupItems, live: liveGroupItemCount, ok: liveGroupItemCount >= expectedGroupItems },
};

// --- The three predicates that are not plain subset checks -----------------
//
// `postgres_default_admin_upstream_topology_complete`,
// `postgres_default_admin_routing_strategies_complete` and
// `postgres_default_vendor_upstream_accounts_complete` each inspect state the
// seed owns. They are reported separately because a subset miss and a state
// miss have different causes.

// Vendor default accounts: enabled + at least one active credential.
const accounts = psql(`
  SELECT account.account_code,
         account.status,
         account.deleted_at IS NULL AS alive,
         account.metadata ->> 'itemType' AS item_type,
         (SELECT count(*) FROM ai_upstream_account_credential c
           WHERE c.account_id = account.id AND c.status = 1 AND c.is_active AND c.deleted_at IS NULL) AS active_creds
  FROM ai_upstream_account account
  WHERE account.metadata ->> 'itemType' = 'default_vendor_upstream_account'
  ORDER BY account.account_code
`).split('\n').filter(Boolean).map((line) => {
  const [accountCode, status, alive, itemType, activeCreds] = line.split('|');
  return { accountCode, status, alive: alive === 't', itemType, activeCreds: Number(activeCreds) };
});

// Routing strategies owned by the seed.
//
// NOTE the tenant: `postgres_default_admin_routing_strategies_complete` binds
// `DEFAULT_IAM_TENANT_ID`, which is `sdkwork-iam`'s
// `DEFAULT_IAM_TENANT_SQL_ID = 100_001` — *not* the `tenant_id = 0` the
// resource/group/endpoint subset checks use. Probing with 0 reports "0
// strategies" and looks like a real miss when the rows are in fact present.
const SEED_TENANT_ID = 100001;
const SEED_ORGANIZATION_ID = 0;

const strategies = psql(`
  SELECT strategy_code FROM ai_routing_strategy
  WHERE tenant_id = ${SEED_TENANT_ID} AND organization_id = ${SEED_ORGANIZATION_ID}
    AND status = 1 AND deleted_at IS NULL
  ORDER BY strategy_code
`).split('\n').filter(Boolean);

// Control-plane instances the seed declares.
const instances = psql(`
  SELECT instance_code FROM ops_gateway_instance
  WHERE tenant_id = ${SEED_TENANT_ID} AND organization_id = ${SEED_ORGANIZATION_ID}
    AND deleted_at IS NULL
  ORDER BY instance_code
`).split('\n').filter(Boolean);

report.vendorAccounts = {
  total: accounts.length,
  enabled: accounts.filter((a) => a.status === '1' && a.alive).length,
  withActiveCredential: accounts.filter((a) => a.activeCreds > 0).length,
  notEnabled: accounts.filter((a) => a.status !== '1' || !a.alive).map((a) => a.accountCode),
  noActiveCredential: accounts.filter((a) => a.activeCreds === 0).map((a) => a.accountCode),
};
report.routingStrategies = { count: strategies.length, codes: strategies };
report.gatewayInstances = { count: instances.length, codes: instances };

console.log(JSON.stringify(report, null, 2));


#!/usr/bin/env node
/**
 * Upstream dial-URL shape audit (the "eighth face").
 *
 * Answers: for every (vendor x protocol) pair the catalog declares, does the
 * URL the transport will actually dial equal the URL the vendor documents?
 *
 * ---------------------------------------------------------------------------
 * Why this audit exists (measured, not assumed)
 * ---------------------------------------------------------------------------
 * `resolve_upstream_base_url` resolves a base URL through five hops:
 *
 *   account.protocols[P] -> account.default -> supplier.protocols[P]
 *        -> supplier.default -> route_base_url (ai_upstream_supplier_endpoint.base_url)
 *
 * On the live dev DB the first FOUR hops are empty for all 27 suppliers and all
 * 27 accounts (`protocols = '[]'`, `default_base_url` NULL), so resolution
 * always falls through to the endpoint's bare host. Then
 * `ProviderPassthroughTarget::build_uri` concatenates naively:
 *
 *   format!("{}{}", self.base_url(), path_and_query)
 *
 * Meanwhile the catalog (`models/<vendor>/<region>/vendor.json`
 * `protocolBaseUrls.<proto>` = { host, pathPrefix }) carries the authoritative
 * base URL. Nothing ever puts `pathPrefix` into the dialed URL unless someone
 * happened to bake it into the endpoint row.
 *
 * Result: static reachability can be 100% green while the dialed URL is wrong.
 * This audit constructs the URL on both sides and diffs them.
 *
 * Usage:
 *   node scripts/dev/audit-upstream-dial-url-shape.mjs
 *   node scripts/dev/audit-upstream-dial-url-shape.mjs --json out.json
 *   node scripts/dev/audit-upstream-dial-url-shape.mjs --destructive-only
 *   node scripts/dev/audit-upstream-dial-url-shape.mjs --self-test
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const modelsRoot = process.env.SDKWORK_MODELS_ROOT ?? 'D:/sdkwork-space/sdkwork-models';
const modelsDir = path.join(modelsRoot, 'models');

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : undefined;
};

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

// The three LLM protocol codes the catalog is allowed to carry base URLs for.
const LLM_PROTOCOLS = ['openai_compatible', 'openai_responses', 'anthropic_messages'];

// ---------------------------------------------------------------------------
// The vendor-correct URL model (derived from vendor/SDK sources, not guessed)
// ---------------------------------------------------------------------------
// `protocolBaseUrls.<proto>` = { host, pathPrefix } is the BASE URL. The
// catalog schema (`sdkwork-models/schemas/vendor.schema.json`) states it
// verbatim:
//
//     "baseUri is derived as https://{host}{pathPrefix}; pathPrefix must be a
//      member of the protocol's family standardPathPrefixes declared in
//      models/protocols.json"
//
// and protocols.json enumerates the legal prefixes per family:
//
//   family openai    : "", /v1, /v2, /api/v1, /api/v3, /compatible-mode/v1,
//                      /api/paas/v4, /v1beta/openai, /openai/v1
//   family anthropic : "", /v1, /anthropic, /api/anthropic,
//                      /apps/anthropic, /step_plan
//
// Crucially the two families place the version segment DIFFERENTLY, so what
// the client appends on top of the base is family-dependent:
//
//   openai family — the version lives IN the prefix. The OpenAI SDK appends
//   `/chat/completions` (`/v1/responses` for the Responses API). Verified:
//     api.openai.com + /v1                 -> /v1/chat/completions          (OpenAI)
//     dashscope.aliyuncs.com + /compatible-mode/v1 -> /compatible-mode/v1/chat/completions (Aliyun)
//     open.bigmodel.cn + /api/paas/v4      -> /api/paas/v4/chat/completions (Zhipu)
//
//   anthropic family — the prefix names a SURFACE and the SDK supplies the
//   version. The Anthropic SDK hardcodes `https://api.anthropic.com` as its
//   default base (`anthropic-sdk-python/src/anthropic/_client.py:105-108`) and
//   appends `/v1/messages`. Verified:
//     api.anthropic.com                    -> /v1/messages                  (Anthropic default base)
//     api.deepseek.com + /anthropic        -> /anthropic/v1/messages        (DeepSeek docs)
//     open.bigmodel.cn + /api/anthropic    -> /api/anthropic/v1/messages    (Zhipu docs cURL)
//
// ⇒ one rule, family-aware op path. The single exception found is the
//   `anthropic` vendor row itself (pathPrefix "/v1" duplicates the SDK version).
const OP_PATH_BY_FAMILY = {
  openai: '/chat/completions',
  anthropic: '/v1/messages',
};

// Which op path to append, per protocol code.
const OPERATION_PATH = {
  openai_compatible: OP_PATH_BY_FAMILY.openai,
  openai_responses: '/responses',
  anthropic_messages: OP_PATH_BY_FAMILY.anthropic,
};

// Protocols whose version segment lives in the base URL prefix (OpenAI family).
// These get the `/v1` strip when the base already ends with `/v1`.
const OPENAI_FAMILY_PROTOCOLS = new Set(['openai_compatible', 'openai_responses']);

// The provider namespace a client puts in front of the operation path. The
// edge passthrough router only registers `/{provider}/{*path}` forms
// (`passthrough.rs:190`), so the inbound path is always namespace + op path.
const PROVIDER_NAMESPACE = {
  openai_compatible: 'openai',
  openai_responses: 'openai',
  anthropic_messages: 'anthropic',
};

const INBOUND_PATH = Object.fromEntries(
  Object.entries(OPERATION_PATH).map(([proto, op]) => [proto, `/${PROVIDER_NAMESPACE[proto]}${op}`]),
);

/**
 * Mirror `split_provider_passthrough_path` EXACTLY.
 *
 * The real implementation (`passthrough.rs:2231`) splits on the FIRST '/'
 * only and drops that single leading segment. It does NOT consult
 * `is_standard_path_namespace` — that predicate is only used by
 * `standard_path_from_passthrough_uri` for a different purpose.
 *
 *   /anthropic/v1/messages       -> /v1/messages
 *   /openai/v1/chat/completions  -> /v1/chat/completions
 *
 * Getting this wrong (e.g. treating `v1` as a strippable namespace) silently
 * deletes the version segment and makes every comparison meaningless.
 */
function stripProviderNamespace(p) {
  const idx = p.indexOf('/', 1);
  if (idx < 0) return p;
  const rest = p.slice(idx);
  return rest.length ? rest : '/';
}

/** Mirror `base_url_has_openai_v1_prefix()`: path === "/v1" or ends with "/v1". */
function baseUrlHasV1(baseUrl) {
  try {
    const p = new URL(baseUrl).pathname.replace(/\/+$/, '');
    return p === '/v1' || p.endsWith('/v1');
  } catch {
    return false;
  }
}

/**
 * Mirror the ONE composition rule shared by BOTH upstream transports.
 *
 * Two independent implementations were read and found to be identical:
 *   - edge passthrough : `provider_passthrough_transport.rs:83,91`
 *   - relay            : `openai_compatible_relay.rs:360`
 *
 *   if base_url path === "/v1" or ends_with("/v1"):
 *       path = path.strip_prefix("/v1")
 *   uri = format!("{}{}", base_url, path)
 *
 * The relay's `includes_openai_v1_prefix` is set from the same shape test.
 * `openai_responses` reaches upstream through the relay
 * (`router-service/src/api/openai_responses.rs:318` mounts `/v1/responses`),
 * NOT through the edge passthrough, but the composition rule is the same.
 */
function normalizeOpenAiPath(baseUrl, inboundPath) {
  if (baseUrlHasV1(baseUrl) && inboundPath.startsWith('/v1/')) return inboundPath.slice(3);
  return inboundPath;
}

/** Mirror `build_uri`: naive concatenation. */
function buildUri(baseUrl, dialPath) {
  return baseUrl.replace(/\/+$/, '') + dialPath;
}

/**
 * What the transport will actually dial today, given the live base URL.
 *
 * The live base URL resolves to the bare endpoint host (all four higher
 * resolution hops are empty), so the only segment source left is the op path.
 *
 *   edge passthrough (all three protocols):
 *       op path = client path with the FIRST segment removed
 *   relay (`/v1/responses` is mounted here, not on the edge):
 *       op path = the same string, hardcoded
 *
 * Both then apply the shared `/v1` strip (OpenAI family only) + concatenation.
 */
function dialedUri(liveBaseUrl, protocol) {
  const opPath = OPERATION_PATH[protocol];
  const pathAfterNamespace = stripProviderNamespace(INBOUND_PATH[protocol]);
  // The namespace strip must reproduce the op path exactly; if it does not,
  // the router is not serving the shape this audit assumes.
  if (pathAfterNamespace !== opPath) {
    throw new Error(
      `namespace strip mismatch for ${protocol}: ${INBOUND_PATH[protocol]} -> ${pathAfterNamespace} != ${opPath}`,
    );
  }
  const dialPath = OPENAI_FAMILY_PROTOCOLS.has(protocol)
    ? normalizeOpenAiPath(liveBaseUrl, pathAfterNamespace)
    : pathAfterNamespace;
  return buildUri(liveBaseUrl, dialPath);
}

/** What the vendor actually serves, per catalog. `host` is scheme-less. */
function expectedUri(host, pathPrefix, protocol) {
  const h = host.replace(/\/+$/, '');
  const withScheme = /^https?:\/\//.test(h) ? h : `https://${h}`;
  const p = (pathPrefix ?? '').replace(/\/+$/, '');
  return withScheme + p + OPERATION_PATH[protocol];
}

// ---------------------------------------------------------------------------
// Self-test: the URL model must reproduce documented vendor URLs
// ---------------------------------------------------------------------------
// Each row is a URL taken verbatim from a vendor's own documentation or SDK
// source. If the model ever drifts, this fails loudly instead of silently
// producing plausible-looking comparisons.
//
//   docs.deepseek.com  "base_url being https://api.deepseek.com/anthropic"
//   docs.bigmodel.cn   curl https://open.bigmodel.cn/api/anthropic/v1/messages
//   Aliyun Model Studio "base_url ... ends with /compatible-mode/v1"
//   anthropic-sdk-python src/anthropic/_client.py:105-108
//                      default base_url = https://api.anthropic.com
const MODEL_FIXTURES = [
  // [protocol, host, pathPrefix, documented URL]
  ['openai_compatible', 'api.openai.com', '/v1', 'https://api.openai.com/v1/chat/completions'],
  ['openai_compatible', 'dashscope.aliyuncs.com', '/compatible-mode/v1', 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'],
  ['openai_compatible', 'open.bigmodel.cn', '/api/paas/v4', 'https://open.bigmodel.cn/api/paas/v4/chat/completions'],
  ['openai_compatible', 'api.deepseek.com', '/v1', 'https://api.deepseek.com/v1/chat/completions'],
  ['openai_compatible', 'qianfan.baidubce.com', '/v2', 'https://qianfan.baidubce.com/v2/chat/completions'],
  ['anthropic_messages', 'api.anthropic.com', '', 'https://api.anthropic.com/v1/messages'],
  ['anthropic_messages', 'api.deepseek.com', '/anthropic', 'https://api.deepseek.com/anthropic/v1/messages'],
  ['anthropic_messages', 'open.bigmodel.cn', '/api/anthropic', 'https://open.bigmodel.cn/api/anthropic/v1/messages'],
  ['anthropic_messages', 'dashscope.aliyuncs.com', '/apps/anthropic', 'https://dashscope.aliyuncs.com/apps/anthropic/v1/messages'],
];

function runSelfTest() {
  let failed = 0;
  for (const [protocol, host, pathPrefix, documented] of MODEL_FIXTURES) {
    const derived = expectedUri(host, pathPrefix, protocol);
    const ok = derived === documented;
    if (!ok) failed += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${protocol.padEnd(20)} ${derived}`);
    if (!ok) console.log(`     documented  ${documented}`);
  }
  console.log(`\nself-test: ${MODEL_FIXTURES.length - failed}/${MODEL_FIXTURES.length} documented URLs reproduced`);
  if (failed) {
    console.log('\nThe URL model no longer matches vendor documentation. Fix the model before trusting any verdict.');
  }
  return failed;
}

if (flag('--self-test')) {
  process.exit(runSelfTest() > 0 ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Catalog side
// ---------------------------------------------------------------------------
function collectVendorFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const walk = (d, depth) => {
    if (depth > 6) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p, depth + 1);
      else if (e.name === 'vendor.json') out.push(p);
    }
  };
  walk(dir, 0);
  return out;
}

/**
 * Catalog layout: models/<vendor>/<region>/vendor.json
 * We key on the region the live supplier row actually represents, so a vendor
 * whose cn and global variants carry different hosts is compared correctly.
 */
const catalog = new Map(); // `${vendorCode}\u0000${regionCode}` -> entry
const catalogByVendor = new Map(); // vendorCode -> [entry, ...]
for (const f of collectVendorFiles(modelsDir)) {
  let j;
  try { j = readJson(f); } catch { continue; }
  const code = j.vendorCode ?? j.code ?? j.id;
  if (!code) continue;
  const entry = {
    code,
    regionCode: j.regionCode ?? j.region ?? 'global',
    file: path.relative(modelsRoot, f),
    protocolBaseUrls: j.protocolBaseUrls ?? {},
    supportedProtocols: j.supportedProtocols ?? [],
  };
  catalog.set(`${code}\u0000${entry.regionCode}`, entry);
  if (!catalogByVendor.has(code)) catalogByVendor.set(code, []);
  catalogByVendor.get(code).push(entry);
}

// ---------------------------------------------------------------------------
// Live DB side (via WSL psql, mirroring audit-model-route-reachability.mjs)
// ---------------------------------------------------------------------------
function readDevDsn() {
  const envFile = path.join(repoRoot, '.env.postgres');
  if (fs.existsSync(envFile)) {
    const env = {};
    for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (m) env[m[1]] = m[2].trim();
    }
    if (env.SDKWORK_DATABASE_PASSWORD) {
      return {
        host: env.SDKWORK_DATABASE_HOST ?? '127.0.0.1',
        port: env.SDKWORK_DATABASE_PORT ?? '5432',
        user: env.SDKWORK_DATABASE_USERNAME,
        password: env.SDKWORK_DATABASE_PASSWORD,
        database: env.SDKWORK_DATABASE_NAME,
      };
    }
  }
  return null;
}

// psql treats a literal newline inside `-c` as a meta-command terminator, so
// every query must be flattened to one line before it crosses the boundary.
const flatten = (sql) => sql.replace(/\s+/g, ' ').trim();

function psql(dsn, sql) {
  const out = execFileSync(
    'wsl.exe',
    ['-d', 'Ubuntu-22.04', '--', 'bash', '-lc',
      `PGPASSWORD=${dsn.password} psql -h ${dsn.host} -p ${dsn.port} -U ${dsn.user} -d ${dsn.database} -t -A -F'|' -c ${JSON.stringify(flatten(sql))}`],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return out.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => l.split('|'));
}

const dsn = readDevDsn();
let liveEndpoints = [];   // { supplierCode, endpointCode, baseUrl, protocols, defaultBaseUrl }
let liveAccounts = [];    // { supplierCode, accountCode, baseUrl, protocols, defaultBaseUrl }
if (dsn) {
  const epRows = psql(dsn, `
    SELECT s.supplier_code, e.endpoint_code, e.base_url,
           COALESCE(s.protocols::text,'[]'), COALESCE(s.default_base_url,'')
      FROM sdkwork_ai_dev.ai_upstream_supplier_endpoint e
      JOIN sdkwork_ai_dev.ai_upstream_supplier s ON s.id = e.supplier_id
     WHERE s.deleted_at IS NULL
     ORDER BY s.supplier_code, e.endpoint_code`);
  liveEndpoints = epRows.map((r) => ({
    supplierCode: r[0], endpointCode: r[1], baseUrl: r[2],
    protocols: r[3], defaultBaseUrl: r[4],
  }));

  const acRows = psql(dsn, `
    SELECT s.supplier_code, a.account_code, COALESCE(e.base_url,''),
           COALESCE(a.protocols::text,'[]'), COALESCE(a.default_base_url,'')
      FROM sdkwork_ai_dev.ai_upstream_account a
      JOIN sdkwork_ai_dev.ai_upstream_supplier s ON s.id = a.supplier_id
      LEFT JOIN sdkwork_ai_dev.ai_upstream_supplier_endpoint e ON e.id = a.preferred_endpoint_id
     WHERE a.deleted_at IS NULL AND s.deleted_at IS NULL
     ORDER BY s.supplier_code, a.account_code`);
  liveAccounts = acRows.map((r) => ({
    supplierCode: r[0], accountCode: r[1], baseUrl: r[2],
    protocols: r[3], defaultBaseUrl: r[4],
  }));
}

// ---------------------------------------------------------------------------
// Diff
// ---------------------------------------------------------------------------
const rows = [];
const unmatchedVendors = [];
const liveVendors = [...new Set(liveEndpoints.map((e) => e.supplierCode))];

for (const vendorCode of liveVendors) {
  const eps = liveEndpoints.filter((e) => e.supplierCode === vendorCode);
  const candidates = catalogByVendor.get(vendorCode);
  if (!candidates?.length) { unmatchedVendors.push(vendorCode); continue; }

  // Prefer the region variant whose openai_compatible host matches a live
  // endpoint host; fall back to the first candidate.
  const liveHosts = new Set(eps.map((e) => { try { return new URL(e.baseUrl).host; } catch { return ''; } }));
  const pick = candidates.find((c) =>
    Object.values(c.protocolBaseUrls).some((pb) => liveHosts.has(pb.host))) ?? candidates[0];

  const ep = eps[0];
  if (!ep.baseUrl) continue;

  // Live resolution: all four higher hops are empty -> endpoint row is used.
  const resolvedBase = ep.baseUrl;

  for (const proto of LLM_PROTOCOLS) {
    const pb = pick.protocolBaseUrls[proto];
    if (!pb) continue;

    const dialed = dialedUri(resolvedBase, proto);
    const expected = expectedUri(pb.host, pb.pathPrefix, proto);

    let verdict;
    if (dialed === expected) verdict = 'OK';
    else {
      // Same host, different path => the prefix never made it into the URL.
      // Different host => the live endpoint row points at the wrong domain.
      verdict = liveHosts.has(new URL(expected).host) ? 'PREFIX-MISSING' : 'HOST-WRONG';
    }

    const prefixIsV1 = (pb.pathPrefix ?? '').replace(/\/+$/, '') === '/v1';

    rows.push({
      vendor: vendorCode,
      region: pick.regionCode,
      protocol: proto,
      verdict,
      catalogHost: pb.host,
      catalogPathPrefix: pb.pathPrefix ?? '',
      liveBaseUrl: resolvedBase,
      dialed,
      expected,
      // A mismatch is "destructive" when no lucky `/v1` overlap can save it.
      destructive: verdict !== 'OK' && !prefixIsV1,
      // An OK is "coincidence" when it only works because both sides are `/v1`.
      coincidenceOk: verdict === 'OK' && !prefixIsV1,
    });
  }
}

const tally = rows.reduce((a, r) => { a[r.verdict] = (a[r.verdict] ?? 0) + 1; return a; }, {});
const okRows = rows.filter((r) => r.verdict === 'OK');
const badRows = rows.filter((r) => r.verdict !== 'OK');
const destructive = badRows.filter((r) => r.destructive);
const coincidence = okRows.filter((r) => r.coincidenceOk);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const out = [];
out.push('=== Upstream dial-URL shape audit ===');
out.push(`catalog vendor/region entries: ${catalog.size} (${catalogByVendor.size} vendors)`);
out.push(`live suppliers: ${liveVendors.length}, live endpoints: ${liveEndpoints.length}, live accounts: ${liveAccounts.length}`);
out.push('');
if (unmatchedVendors.length) {
  out.push(`live suppliers with no catalog vendor.json: ${unmatchedVendors.join(', ')}`);
  out.push('');
}
out.push(`pairs compared: ${rows.length}`);
out.push(`  OK              : ${tally.OK ?? 0}  (of which coincidence-only: ${coincidence.length})`);
out.push(`  PREFIX-MISSING  : ${tally['PREFIX-MISSING'] ?? 0}`);
out.push(`  HOST-WRONG      : ${tally['HOST-WRONG'] ?? 0}`);
out.push('');

if (coincidence.length) {
  out.push('--- OK by coincidence only (dials right solely because both sides are "/v1") ---');
  for (const r of coincidence) {
    out.push(`  ${r.vendor.padEnd(14)} ${r.protocol.padEnd(20)} prefix=${r.catalogPathPrefix}`);
  }
  out.push('');
}

const show = flag('--destructive-only') ? destructive : badRows;
if (show.length) {
  out.push('--- mismatches ---');
  out.push('  ' + 'vendor'.padEnd(14) + 'protocol'.padEnd(20) + 'verdict'.padEnd(16) + 'dialed');
  for (const r of show) {
    out.push('  ' + r.vendor.padEnd(14) + r.protocol.padEnd(20) + r.verdict.padEnd(16) + r.dialed);
    out.push('  ' + ''.padEnd(14) + ''.padEnd(20) + 'expected ->'.padEnd(16) + r.expected);
  }
  out.push('');
  out.push(`destructive (pathPrefix !== "/v1", cannot be rescued by accident): ${destructive.length}`);
  out.push(`  vendors: ${[...new Set(destructive.map((r) => r.vendor))].join(', ')}`);
  out.push(`  protocols: ${JSON.stringify(destructive.reduce((a, r) => { a[r.protocol] = (a[r.protocol] ?? 0) + 1; return a; }, {}))}`);
}

console.log(out.join('\n'));

const jsonOut = opt('--json');
if (jsonOut) {
  fs.writeFileSync(jsonOut, JSON.stringify({ generatedAt: new Date().toISOString(), tally, rows }, null, 2));
  console.log(`\njson written: ${jsonOut}`);
}

// Exit non-zero when a destructive mismatch exists, so this can gate CI.
process.exit(destructive.length > 0 ? 1 : 0);

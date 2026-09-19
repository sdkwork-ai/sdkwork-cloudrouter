#!/usr/bin/env node
/**
 * Per-API end-to-end reachability audit for the content-generation chain.
 *
 * `check-cloudrouter-ai-routing-consistency.mjs` answers "do the declarations
 * agree?" — every seeded api code has a taxonomy route, every arm has a
 * template, every namespace is in every registry. It is a *static* gate over
 * the ingress and the catalogue.
 *
 * It deliberately does not answer the question an operator actually asks before
 * a commercial launch: **for this one API, can a request get all the way from
 * the published path to a concrete vendor account, and can the accounting side
 * price it?** Those two halves live in tables the static gate never touches
 * (account routes, resource entitlements, price books), so an API can be green
 * on every gate above and still fail closed at runtime with
 * `50201 no upstream account routes are configured` or a pricing-preflight
 * refusal.
 *
 * This audit walks the whole chain for every seeded api_endpoint, one API at a
 * time, and reports the first link that breaks:
 *
 *   path (contract/arm)
 *     -> api_code
 *       -> taxonomy route         (capability + billing meter + task class)
 *         -> resource_code        (the `api.<vendor>.<name>` resource)
 *           -> resource-group grant on an account group
 *             -> callable account in that group (enabled + base_url + credential)
 *               -> wire protocol      (derived from the api_code, NOT the supplier)
 *                 -> price book       (a live rate for the capability's meter)
 *
 * Exit code is 0 only when every API reaches every link. `--list-gaps` prints
 * only the failures; `--json` emits the machine-readable form.
 *
 * Read-only: it never writes to the database.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const seedRoot = path.join(repoRoot, 'data', 'ai-routing');

const argv = process.argv.slice(2);
const hasFlag = (name) => argv.includes(name);
const flagValue = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};

const LIST_GAPS = hasFlag('--list-gaps');
const AS_JSON = hasFlag('--json');
const ONLY = flagValue('--only'); // substring filter on api_code

// ---------------------------------------------------------------------------
// 1. The seeded catalogue: resources, groups, endpoints.
// ---------------------------------------------------------------------------

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const manifest = readJson(path.join(seedRoot, 'install-manifest.json'));

const resources = new Map();
for (const rel of manifest.sections.resources) {
  for (const item of readJson(path.join(seedRoot, 'resources', rel)).items ?? []) {
    resources.set(item.resourceCode, item);
  }
}

const groups = new Map();
for (const rel of manifest.sections.resourceGroups) {
  for (const g of readJson(path.join(seedRoot, 'resource-groups', rel)).items ?? []) {
    groups.set(g.groupCode, {
      groupCode: g.groupCode,
      items: (g.items ?? []).map((i) => i.resourceCode),
    });
  }
}

const seededEndpoints = [...resources.values()].filter(
  (r) => r.resourceType === 'api_endpoint',
);

// ---------------------------------------------------------------------------
// 2. The routing taxonomy: api_code -> { capability, family, meter }.
// ---------------------------------------------------------------------------
//
// Parsed from the Rust source rather than transcribed, so adding an endpoint
// without registering it shows up here instead of drifting.

const TAXONOMY = path.join(
  repoRoot,
  'services',
  'sdkwork-cloudrouter-router-service',
  'src',
  'application',
  'ai_route_taxonomy.rs',
);

function parseTaxonomy() {
  const source = fs.readFileSync(TAXONOMY, 'utf8');
  const routes = new Map();
  // `llm("openai.chat_completions", "openai.chat_completions", RoutingCapability::Llm, BillingMeter::TextInputToken, ...)`
  // and the media_task / media / etc variants share the shape
  // `<ctor>("<api_code>", "<route>", RoutingCapability::<Cap>, BillingMeter::<Meter>`.
  const re =
    /(\w+)\s*\(\s*"([a-z0-9_]+(?:\.[a-z0-9_]+)+)"\s*,\s*"([^"]+)"\s*,\s*RoutingCapability::(\w+)\s*,\s*BillingMeter::(\w+)/g;
  for (const m of source.matchAll(re)) {
    routes.set(m[2], {
      apiCode: m[2],
      routeCode: m[3],
      capability: m[4],
      meter: m[5],
    });
  }
  return routes;
}

const taxonomy = parseTaxonomy();

/**
 * `BillingMeter` is a Rust enum whose `code()` returns the snake_case string
 * stored in the database (`BillingMeter::LlmInputToken` -> `"llm_input_token"`).
 * The taxonomy source names the *variant*, so every comparison against a live
 * `pricing_rate.meter_code` has to convert first. Skipping this step makes all
 * 58 APIs look unpriced, because no DB row is ever spelled `LlmInputToken`.
 */
function meterCode(variant) {
  return variant
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

// Cross-check the derivation against the enum's own `code()` table so a future
// variant with an irregular code (`SfxResult` -> `sfx_result` is regular, but
// nothing guarantees the next one is) cannot drift silently.
function meterCodeTable() {
  const source = fs.readFileSync(
    path.join(repoRoot, 'generated', 'types', 'rust', 'domain.rs'),
    'utf8',
  );
  const start = source.indexOf('impl BillingMeter');
  const end = source.indexOf('\n}', start);
  const table = new Map();
  for (const m of source.slice(start, end).matchAll(/Self::(\w+)\s*=>\s*"([^"]+)"/g)) {
    table.set(m[1], m[2]);
  }
  return table;
}

const METER_CODES = meterCodeTable();
const meterCodeOf = (variant) => METER_CODES.get(variant) ?? meterCode(variant);

/**
 * Meter name -> the capability whose models are billed with it.
 *
 * `pricing_rate` has no capability column, so the family prefix of the meter
 * code is the only structural link available. This mirrors the routing
 * taxonomy's own grouping (every `audio_*` meter belongs to an Audio route,
 * every `video_*` to Video, and so on), and the fallback below covers the
 * generic `api_*` meters which several capabilities share.
 */
const METER_FAMILY_CAPABILITY = {
  audio_input_token: 'Audio',
  audio_output_token: 'Audio',
  audio_input_minute: 'Audio',
  audio_output_minute: 'Audio',
  audio_input_second: 'Audio',
  audio_output_second: 'Audio',
  tts_input_character: 'Audio',
  speech_character: 'Audio',
  stt_audio_minute: 'Audio',
  sfx_result: 'Audio',
  embedding_input_token: 'Embedding',
  embedding_image: 'Embedding',
  image_input_token: 'Image',
  image_output_token: 'Image',
  image_result: 'Image',
  image_pixel: 'Image',
  image_megapixel: 'Image',
  llm_input_token: 'Chat',
  llm_output_token: 'Chat',
  llm_reasoning_token: 'Chat',
  llm_cache_read_token: 'Chat',
  llm_cache_write_token: 'Chat',
  llm_cache_storage_token_hour: 'Chat',
  video_input_token: 'Video',
  video_output_token: 'Video',
  video_input_second: 'Video',
  video_output_second: 'Video',
  video_result: 'Video',
  music_output_second: 'Music',
  rerank_search: 'Rerank',
  rerank_document: 'Rerank',
};


// ---------------------------------------------------------------------------
// 3. Wire protocol, derived from the api_code (never from the supplier).
// ---------------------------------------------------------------------------
//
// Mirrors `application::upstream_base_url::protocol_code_from_api_code`, whose
// doc comment is explicit that this is a *loose* match covering only the LLM
// protocol families and that everything else — embeddings, images, audio,
// video, files, and the whole vendor-native surface — returns `None` and falls
// through to the **default Base URL chain**:
//
//     "embeddings 等无协议资源返回 None，走默认 Base URL 链"
//
// So `None` is NOT a defect. An audit that treats it as one lights up the
// entire non-chat openai surface (22 APIs) as broken while nothing is wrong.
// What *would* be a defect is a generic LLM family losing its protocol, so that
// is the only thing asserted here.

function protocolCodeFromApiCode(apiCode) {
  if (apiCode.includes('anthropic')) return 'anthropic_messages';
  if (apiCode.includes('responses')) return 'openai_responses';
  if (apiCode.includes('chat') || apiCode.includes('completion')) {
    return 'openai_chat_completions';
  }
  return null;
}

// The routes that genuinely require an LLM protocol.
//
// A protocol is only *needed* when the request body must be serialised in a
// specific wire dialect AND no other base URL can serve it. `resolve_upstream_base_url`
// is a fallback chain — a `None` protocol drops to `account_default_base_url`
// then `supplier_default_base_url` — so a route that ships its own vendor-native
// serializer (gemini's `:generateContent`) is fine with `None`.
//
// Only the generic openai-family chat surface is required to map, because those
// paths are replayed verbatim to an openai-shaped upstream and there is no
// vendor-native serializer behind them.
const PROTOCOL_REQUIRED = [
  /\.chat_completions$/,
  /\.chat$/,
  /\.completions?$/,
  /\.responses$/,
  /\.messages$/,
  /^anthropic\./,
];

// ---------------------------------------------------------------------------
// 4. The live database view (authoritative when reachable).
// ---------------------------------------------------------------------------

/**
 * `wsl.exe -- bash -lc "<cmd>"` cannot carry a multi-line SQL string: the
 * newlines arrive as literal `\n` and PostgreSQL rejects the statement. Every
 * query in this file is therefore written as one line, and this helper exists so
 * that a future re-indent cannot silently reintroduce the breakage.
 */
function oneLine(sql) {
  return sql.replace(/\s*\n\s*/g, ' ').trim();
}

function psql(dsn, sql) {
  const out = execFileSync(
    'wsl.exe',
    [
      '-d', 'Ubuntu-22.04', '--', 'bash', '-lc',
      `PGPASSWORD=${dsn.password} psql -h ${dsn.host} -p ${dsn.port} -U ${dsn.user} -d ${dsn.database} -t -A -F'|' -c ${JSON.stringify(oneLine(sql))}`,
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
  const url = String(process.env.SDKWORK_DATABASE_URL ?? '').trim();
  if (url.startsWith('postgres')) {
    try {
      const u = new URL(url);
      return {
        host: u.hostname,
        port: u.port || '5432',
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
let liveError = null;
const dsn = readDevDsn();
if (dsn) {
  try {
    // The default mixed account group is the one every app-session request
    // resolves onto (`is_default`), so it is the group whose grants decide
    // whether an end user can reach an API.
    const defaultGroupRow = psql(
      dsn,
      "SELECT id, group_code FROM ai_upstream_account_group WHERE is_default AND deleted_at IS NULL AND status = 1 LIMIT 1",
    )[0];
    const defaultGroupId = defaultGroupRow?.[0];
    const defaultGroupCode = defaultGroupRow?.[1] ?? '(none)';

    // Every resource code the default group can reach, expanded through its
    // granted resource groups.
    const grantedRows = psql(
      dsn,
      `SELECT item.resource_code
         FROM ai_resource_binding binding
         JOIN ai_resource_group rg ON rg.group_code = binding.resource_group_code AND rg.deleted_at IS NULL
         JOIN ai_resource_group_item item ON item.resource_group_id = rg.id AND item.deleted_at IS NULL
        WHERE binding.account_group_id = ${defaultGroupId}
          AND binding.binding_scope = 'account_group'
          AND binding.grant_type = 'allow'
          AND binding.deleted_at IS NULL
          AND binding.status = 1
          AND item.item_type = 'resource'
          AND item.resource_code IS NOT NULL`,
    );
    const granted = new Set(grantedRows.map((r) => r[0]));

    // The default group's callable members: enabled account, resolvable base
    // URL, and at least one active credential. This is exactly what
    // `load_upstream_account_routes` keeps for the routing snapshot.
    const accountRows = psql(
      dsn,
      `SELECT account.account_code,
              COALESCE(supplier.supplier_code, '(none)'),
              COALESCE(account.default_base_url, endpoint.base_url, ''),
              CASE WHEN credential.id IS NOT NULL THEN 'yes' ELSE 'no' END
         FROM ai_upstream_account_group_member member
         JOIN ai_upstream_account account
           ON account.id = member.account_id AND account.deleted_at IS NULL
         LEFT JOIN ai_upstream_supplier supplier
           ON supplier.id = account.supplier_id AND supplier.deleted_at IS NULL
         LEFT JOIN ai_upstream_supplier_endpoint endpoint
           ON endpoint.id = account.preferred_endpoint_id AND endpoint.deleted_at IS NULL
         LEFT JOIN LATERAL (
             SELECT c.id FROM ai_upstream_account_credential c
              WHERE c.account_id = account.id
                AND c.status = 1 AND c.is_active AND c.deleted_at IS NULL
              ORDER BY c.priority, c.id LIMIT 1
         ) credential ON TRUE
        WHERE member.account_group_id = ${defaultGroupId}
          AND member.deleted_at IS NULL
          AND member.status = 1
          AND COALESCE(member.enabled, TRUE)
          AND account.status = 1
        ORDER BY account.account_code`,
    );
    const accounts = accountRows.map((r) => ({
      accountCode: r[0],
      supplierCode: r[1],
      baseUrl: r[2],
      hasCredential: r[3] === 'yes',
    }));
    const callableAccounts = accounts.filter(
      (a) => a.baseUrl && a.hasCredential,
    );

    // Live price books.
    //
    // The live price book is `pricing_rate`, NOT `ai_model_pricing`:
    // `ai_model_pricing` has no `meter_code` column at all, so a query against
    // it fails with `column pricing.meter_code does not exist` and silently
    // degrades this audit to seed-only. `pricing_rate` is the table the
    // pricing preflight actually reads, and it is keyed by `meter_code`.
    //
    // A rate is "live" when it is not retired and its effective window is open.
    // Both `deleted_at` and the effective window matter: a rate that only takes
    // effect next quarter must not be read as "priced today".
    const priceRows = psql(
      dsn,
      `SELECT DISTINCT rate.meter_code
         FROM pricing_rate rate
        WHERE rate.deleted_at IS NULL
          AND (rate.effective_from IS NULL OR rate.effective_from <= NOW())
          AND (rate.effective_to IS NULL OR rate.effective_to > NOW())`,
    );
    const pricedMeters = new Set(priceRows.map((r) => r[0]));

    // capability -> the meters the *catalog* defines for that capability's models.
    //
    // This is the authoritative side of the `pricing_identity` override: the
    // override only fires when the catalog defines a meter for the invoked
    // model. The catalog splits the two halves across sibling directories —
    // `models/<vendor>/<region>/models/<model>.json` carries `primaryCapability`
    // and `catalogKey`, while `.../pricing/<model>.json` carries
    // `prices[].meterCode` keyed by the same `catalogKey` — so the join is on
    // `catalogKey`, not on a shared file.
    const catalogMetersByCapability = new Map();
    const catalogMetersForModel = new Map(); // catalogKey -> Set<meter>
    const catalogCapabilityOfModel = new Map(); // catalogKey -> capability (lowercase)
    const catalogRoot = path.resolve(repoRoot, '..', 'sdkwork-models');
    const jsonAt = (file) => {
      try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
    };
    if (fs.existsSync(catalogRoot)) {
      const walk = (dir, onFile) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.name === 'node_modules' || entry.name === '.git') continue;
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full, onFile);
          else if (entry.name.endsWith('.json')) onFile(full);
        }
      };
      walk(catalogRoot, (file) => {
        const doc = jsonAt(file);
        if (!doc || typeof doc !== 'object') return;
        const key = doc.catalogKey;
        if (typeof key !== 'string') return;
        if (typeof doc.primaryCapability === 'string') {
          catalogCapabilityOfModel.set(key, doc.primaryCapability.toLowerCase());
        }
        if (Array.isArray(doc.prices)) {
          for (const price of doc.prices) {
            if (typeof price?.meterCode !== 'string') continue;
            if (!catalogMetersForModel.has(key)) catalogMetersForModel.set(key, new Set());
            catalogMetersForModel.get(key).add(price.meterCode);
          }
        }
      });
      for (const [key, cap] of catalogCapabilityOfModel) {
        const meters = catalogMetersForModel.get(key);
        if (!meters) continue;
        if (!catalogMetersByCapability.has(cap)) catalogMetersByCapability.set(cap, new Set());
        for (const m of meters) catalogMetersByCapability.get(cap).add(m);
      }
    }

    // Which account each vendor's traffic can land on. The default group holds
    // every official account, so this is a vendor -> account count map.
    const accountsByVendor = new Map();
    for (const a of callableAccounts) {
      accountsByVendor.set(
        a.supplierCode,
        (accountsByVendor.get(a.supplierCode) ?? 0) + 1,
      );
    }

    live = {
      defaultGroupId,
      defaultGroupCode,
      granted,
      accounts,
      callableAccounts,
      accountsByVendor,
      pricedMeters,
      catalogMetersByCapability,
    };
  } catch (error) {
    liveError = error.message;
  }
}

// A silent degradation to seed-only is a *false green*: the account and price
// links are the two halves this audit exists to assert, and reporting "58/58
// reachable" while neither was checked is worse than failing loudly. The dev
// database is expected to be reachable in every environment where this audit is
// a gate, so a connection or query failure is fatal unless the caller opts out
// with `--seed-only` (intended for offline lint runs).
if (!live && !hasFlag('--seed-only')) {
  console.error('per-api-chain-audit: FATAL — the dev database could not be read,');
  console.error('so the account and billing links cannot be asserted.');
  console.error(`  ${liveError ?? 'no DSN resolved from SDKWORK_DATABASE_URL or .env.postgres'}`);
  console.error('Pass --seed-only to intentionally audit the declaration side alone.');
  process.exit(2);
}

// ---------------------------------------------------------------------------
// 5. Walk the chain, one API at a time.
// ---------------------------------------------------------------------------

const CAPABILITY_LABEL = {
  Chat: 'LLM',
  Image: '图片',
  Video: '视频',
  Audio: '音频',
  Music: '音乐',
  Embedding: '向量',
  Rerank: '重排',
  Network: '控制面',
};

/**
 * The account-side vendor code for an api_code.
 *
 * The catalogue names vendors one way (`google`, `bytedance`, `kuaishou`) and
 * the upstream accounts name them another (`gemini`, `jimeng`, `kling`). The api
 * code is namespaced with the *account-side* code, so it is the right key here —
 * see `provider_native_classifier.rs` for the only alias mapping in the codebase
 * (`"google" | "gemini"`).
 */
function vendorFromApiCode(apiCode) {
  return apiCode.split('.')[0];
}

/**
 * Generic endpoints whose api_code prefix is a *surface*, not a vendor.
 *
 * `model_catalog_import::model_endpoint_descriptor` binds models to
 * vendor-agnostic endpoints chosen purely from `primaryCapability`
 * (`openai.images`, `openai.audio`, `openai.video`, `suno.music`, `sfx.sound`,
 * …). The `openai.` / `suno.` prefixes happen to also name a real upstream
 * account, so the vendor-scoped account check resolves for them by accident.
 * `sfx.sound` does not: `sfx` is a capability, and the accounts that can serve
 * it are the four vendors whose catalog models declare `primaryCapability =
 * "sfx"` (elevenlabs / kuaishou→kling / stability_ai / vidu).
 *
 * Checking the prefix literally would report "no callable account for vendor
 * sfx" — a false negative, since the endpoint *is* reachable through those
 * accounts. So the reachability question for a generic endpoint is "does *any*
 * serving vendor have a callable account", not "does the prefix have one".
 */
const GENERIC_ENDPOINT_SERVING_VENDORS = new Map([
  // api_code -> the account-side vendor codes whose accounts can serve it.
  ['sfx.sound', ['kling', 'vidu', 'stability_ai', 'elevenlabs']],
]);

/** Account-side vendors that can serve an api_code, or `null` when scoped. */
function servingVendors(apiCode) {
  return GENERIC_ENDPOINT_SERVING_VENDORS.get(apiCode) ?? null;
}

function auditOne(endpoint) {
  const apiCode = endpoint.apiCode;
  const resourceCode = endpoint.resourceCode;
  const vendorCode = vendorFromApiCode(apiCode);
  const links = [];
  const add = (link, ok, detail) => links.push({ link, ok, detail });

  // (1) taxonomy route
  const route = taxonomy.get(apiCode);
  add(
    'taxonomy',
    Boolean(route),
    route
      ? `${route.routeCode} cap=${route.capability} meter=${route.meter}`
      : 'not registered in ai_route_taxonomy.rs — nothing routes to it',
  );

  // (2) the resource exists and is granted somewhere
  const groupHolders = [...groups.values()]
    .filter((g) => g.items.includes(resourceCode))
    .map((g) => g.groupCode);
  add(
    'resource-in-a-group',
    groupHolders.length > 0,
    groupHolders.length > 0
      ? groupHolders.join(', ')
      : 'no seeded resource group grants this resource — an account in it can never reach the API',
  );

  // (3) wire protocol. `None` is the documented, correct answer for every
  // non-LLM API *and* for vendor-native routes that carry their own serializer
  // — `resolve_upstream_base_url` falls through to the account/supplier default
  // base URL in that case. The failure case is therefore narrow: a route on the
  // generic openai chat surface that the mapper failed to recognise, where chat
  // traffic would be replayed to an openai-shaped upstream without a dialect.
  const protocol = protocolCodeFromApiCode(apiCode);
  const needsProtocol = PROTOCOL_REQUIRED.some((re) => re.test(apiCode));
  add(
    'wire-protocol',
    Boolean(protocol) || !needsProtocol,
    protocol
      ? `${protocol} (derived from api_code)`
      : needsProtocol
        ? 'generic chat surface with NO protocol mapping — the dialect cannot be resolved'
        : 'no protocol: rides the default Base URL chain (expected for non-LLM / vendor-native APIs)',
  );

  if (!live) {
    // Seed-only mode: account and price reachability cannot be asserted, but
    // the *declaration* side still can (see the `--seed-only` note).
    return { apiCode, resourceCode, vendorCode, capability: endpoint.capability, links };
  }

  // (4) granted to the default group
  const grantedToDefault = live.granted.has(resourceCode);
  add(
    'default-group-grant',
    grantedToDefault,
    grantedToDefault
      ? `granted (via ${groupHolders.join(', ') || resourceCode})`
      : `NOT granted to ${live.defaultGroupCode}; a signed-in end user cannot reach it (50201)`,
  );

  // (5) a callable account for *this API's own vendor* in the default group.
  //
  // A global "is any account callable" check would be a false green: an API
  // whose vendor has no account fails closed even when fifty other vendors are
  // healthy. Account selection is by resource entitlement, and the entitlement
  // that matters is the one gated on the vendor's own group, so the vendor is
  // the right scope.
  //
  // For a *generic* endpoint the scope is the set of serving vendors instead of
  // the api_code prefix (see `GENERIC_ENDPOINT_SERVING_VENDORS`): the endpoint
  // is reachable when at least one of them has a callable account, because a
  // request naming a model of that capability resolves onto that vendor's
  // account.
  const servers = servingVendors(apiCode);
  const vendorAccounts = servers
    ? servers.reduce((n, v) => n + (live.accountsByVendor.get(v) ?? 0), 0)
    : (live.accountsByVendor.get(vendorCode) ?? 0);
  const scopeLabel = servers
    ? `serving vendors ${servers.join('/')}`
    : `vendor ${vendorCode}`;
  add(
    'callable-account',
    vendorAccounts > 0,
    vendorAccounts > 0
      ? servers
        ? `${vendorAccounts} callable account(s) across ${scopeLabel} in ${live.defaultGroupCode}`
        : `${vendorAccounts} callable account(s) for ${scopeLabel} in ${live.defaultGroupCode}`
      : `NO callable account for ${scopeLabel} in ${live.defaultGroupCode} `
        + '(needs enabled + base_url + active credential) — this API returns 50201',
  );

  // (6) priced.
  //
  // The taxonomy's meter is only a *default suggestion*. `pricing_identity`
  // documents the authoritative rule:
  //
  //   | 目录定义 | 结果                                                  |
  //   |---------|-------------------------------------------------------|
  //   | 无      | RouteDeclared — keep the taxonomy meter, let preflight diagnose |
  //   | 有交集  | RouteDeclaredWithinCatalog — take the intersection      |
  //   | 无交集  | CatalogDefinition — the CATALOG wins, taxonomy is overridden |
  //
  // The `CatalogDefinition` override only fires when the *catalog defines a
  // meter for the invoked catalog key*. It is keyed on the model the request
  // names, so a route whose declared meter is unpriced is only rescued when a
  // real model of that capability actually carries a priced meter **that the
  // catalog attaches to this capability's models**.
  //
  // A per-capability fallback ("some Chat meter is priced") is NOT enough: that
  // would hide a route declared against a meter no model uses (e.g.
  // `llm_reasoning_token`, which is unpriced), and such a route fails closed at
  // preflight for every request that does not override it. So the check is:
  // the declared meter must be priced, OR the declared meter must be a meter
  // the catalog genuinely defines for this capability's models.
  if (route) {
    const code = meterCodeOf(route.meter);
    const declaredPriced = live.pricedMeters.has(code);
    const catalogDefines = live.catalogMetersByCapability.get(route.capability.toLowerCase())
      ?? new Set();
    // The catalog may legitimately use a *different* meter for the same
    // capability (that is the documented override). Accept the declared meter
    // when either the price book or the catalog knows it; reject a meter
    // neither side defines, which is precisely the `audio_input_second` /
    // `llm_reasoning_token` class of defect.
    const known = declaredPriced || catalogDefines.has(code);
    add(
      'priced',
      known,
      declaredPriced
        ? `meter ${code} has a live rate`
        : catalogDefines.has(code)
          ? `meter ${code} has no live rate but the catalog defines it for `
            + `${route.capability} models`
          : `meter ${code} is defined by neither the price book nor the catalog for `
            + `${route.capability} (catalog uses: ${[...catalogDefines].sort().join(', ') || '<none>'})`,
    );
  }

  return {
    apiCode,
    resourceCode,
    vendorCode,
    capability: endpoint.capability,
    links,
  };
}

const audited = seededEndpoints
  .filter((e) => e.apiCode)
  .filter((e) => !ONLY || e.apiCode.includes(ONLY))
  .map((e) => {
    const route = taxonomy.get(e.apiCode);
    return {
      ...auditOne(e),
      capabilityClass: route?.capability ?? 'Unknown',
      meter: route?.meter ?? null,
    };
  });

// ---------------------------------------------------------------------------
// 6. Report.
// ---------------------------------------------------------------------------

const failures = audited.filter((a) => a.links.some((l) => !l.ok));

if (AS_JSON) {
  console.log(
    JSON.stringify(
      {
        grantView: live ? 'live-db' : 'seed-only',
        liveError,
        defaultGroup: live?.defaultGroupCode ?? null,
        callableAccounts: live?.callableAccounts.length ?? null,
        pricedMeters: live ? live.pricedMeters.size : null,
        audited: audited.length,
        failures: failures.map((f) => ({
          apiCode: f.apiCode,
          resourceCode: f.resourceCode,
          vendorCode: f.vendorCode,
          capability: f.capabilityClass,
          broken: f.links.filter((l) => !l.ok).map((l) => ({ link: l.link, detail: l.detail })),
        })),
      },
      null,
      2,
    ),
  );
  process.exit(failures.length === 0 ? 0 : 1);
}

if (!LIST_GAPS) {
  console.log('='.repeat(78));
  console.log('PER-API END-TO-END CHAIN AUDIT');
  console.log('='.repeat(78));
  console.log(`grant view            : ${live ? 'live-db' : 'seed-only'}`);
  if (liveError) console.log(`live-db error         : ${liveError}`);
  if (!live) {
    console.log('');
    console.log('  !! SEED-ONLY: the resource-grant, callable-account and price links');
    console.log('  !! were NOT asserted. A green result here is a declaration check only.');
  }
  if (live) {
    console.log(`default group         : ${live.defaultGroupCode} (id=${live.defaultGroupId})`);
    console.log(`  granted resources   : ${live.granted.size}`);
    console.log(`  members             : ${live.accounts.length}`);
    console.log(`  callable            : ${live.callableAccounts.length}`);
    console.log(`  distinct vendors    : ${live.accountsByVendor.size}`);
    console.log(`  priced meters       : ${live.pricedMeters.size}`);
  }
  console.log(`seeded api_endpoints  : ${seededEndpoints.length}`);
  console.log(`audited               : ${audited.length}`);
  console.log(`fully reachable       : ${audited.length - failures.length}`);
  console.log(`with a broken link    : ${failures.length}`);
  console.log('');

  // Per-capability roll-up: the shape an operator wants before a launch.
  const byCap = new Map();
  for (const a of audited) {
    const key = a.capabilityClass;
    if (!byCap.has(key)) byCap.set(key, { total: 0, ok: 0 });
    const bucket = byCap.get(key);
    bucket.total += 1;
    if (!a.links.some((l) => !l.ok)) bucket.ok += 1;
  }
  console.log('--- by capability ---');
  for (const [cap, b] of [...byCap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const label = CAPABILITY_LABEL[cap] ?? cap;
    const mark = b.ok === b.total ? 'OK  ' : 'GAP ';
    console.log(`  ${mark} ${label.padEnd(6)} ${String(b.ok).padStart(3)}/${String(b.total).padEnd(3)} ${cap}`);
  }
  console.log('');

  // Per-vendor roll-up: which upstream accounts actually carry this surface.
  const byVendor = new Map();
  for (const a of audited) {
    if (!byVendor.has(a.vendorCode)) byVendor.set(a.vendorCode, { total: 0, ok: 0 });
    const bucket = byVendor.get(a.vendorCode);
    bucket.total += 1;
    if (!a.links.some((l) => !l.ok)) bucket.ok += 1;
  }
  console.log('--- by vendor ---');
  for (const [vc, b] of [...byVendor.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const callable = live ? (live.accountsByVendor.get(vc) ?? 0) : '?';
    const mark = b.ok === b.total ? 'OK  ' : 'GAP ';
    console.log(
      `  ${mark} ${vc.padEnd(20)} ${String(b.ok).padStart(3)}/${String(b.total).padEnd(3)} apis   accounts=${callable}`,
    );
  }
  console.log('');
}

if (failures.length > 0) {
  console.log('--- APIs with a broken link ---');
  for (const f of failures.sort((a, b) => a.apiCode.localeCompare(b.apiCode))) {
    console.log(`  ${f.apiCode}  [${CAPABILITY_LABEL[f.capabilityClass] ?? f.capabilityClass}]`);
    for (const l of f.links.filter((x) => !x.ok)) {
      console.log(`      x ${l.link}: ${l.detail}`);
    }
  }
  console.log('');
  console.log(`per-api-chain-audit: FAILED (${failures.length} of ${audited.length})`);
  process.exit(1);
}

console.log(`per-api-chain-audit: passed (${audited.length}/${audited.length} reachable end to end)`);
process.exit(0);

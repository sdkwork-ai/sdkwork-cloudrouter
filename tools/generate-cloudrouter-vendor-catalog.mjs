#!/usr/bin/env node
/**
 * Generate the Cloud Router vendor catalog matrix from the sdkwork-models catalog.
 *
 * ---------------------------------------------------------------------------
 * Why this generator exists
 * ---------------------------------------------------------------------------
 * `/admin/upstream/suppliers` offers one "官方 Vendor" per vendor the routing
 * resource catalog declares (`data/ai-routing/resources/*.json`). Choosing a
 * vendor must answer two questions for the operator:
 *
 *   1. which LLM API protocols does this vendor's official API speak?
 *   2. what is the official Base URL of each of those protocols, and what is the
 *      vendor's official native Base URL when it publishes no compatible face?
 *
 * Until now those two answers lived in two hand-maintained TypeScript tables
 * (`vendorBaseUrlRules.ts`, `vendorProtocolBaseUrls.ts`) that mirrored
 * `sdkwork-models/models/<vendor>/<region>/vendor.json#protocolBaseUrls` by
 * hand. The copy had already drifted: it was missing `baidu`, `meituan` and
 * `xiaomi`, it keyed Google under the catalog's `google` while the form offers
 * `gemini` (so Gemini resolved to nothing at all), and it had no native host
 * for any media-only vendor.
 *
 * The catalog is the authority; this generator is the only bridge. It reads the
 * catalog's `protocolBaseUrls` and `nativeApiBaseUrl` fields, joins them to the
 * vendor codes Cloud Router actually offers, and emits a deterministic
 * TypeScript module. `--check` fails when the emitted module is stale, so a
 * catalog change cannot silently desync the console again.
 *
 * ---------------------------------------------------------------------------
 * What it reads
 * ---------------------------------------------------------------------------
 *   <models>/models/<vendor>/<region>/vendor.json   protocolBaseUrls, nativeApiBaseUrl
 *   <repo>/data/ai-routing/resources/core-resources.json   the vendor codes the form offers
 *   <repo>/tools/lib/cloudrouter-vendor-catalog-aliases.mjs   Cloud Router code -> catalog code
 *
 * Usage:
 *   node tools/generate-cloudrouter-vendor-catalog.mjs --check    # verify current
 *   node tools/generate-cloudrouter-vendor-catalog.mjs --apply    # regenerate
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CATALOG_VENDOR_CODE_ALIASES, VENDORS_WITHOUT_CATALOG_ADDRESS } from './lib/cloudrouter-vendor-catalog-aliases.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const modelsRoot = process.env.SDKWORK_MODELS_ROOT ?? path.resolve(repoRoot, '..', 'sdkwork-models');

const OUTPUT_PATH = path.join(
  repoRoot,
  'apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudrouter-pc-admin-upstream/src/generated/vendorCatalogMatrix.generated.ts',
);

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const check = args.includes('--check') || !apply;

/**
 * Catalog protocol code -> the supplier form's `LlmProtocolCode`.
 *
 * The catalog names the OpenAI Chat Completions compatible face
 * `openai_compatible` because it describes an API *format*; the supplier form
 * names the same face `openai_chat_completions` because it describes a routing
 * *surface*. The other two codes are identical in both vocabularies. Any other
 * catalog protocol code (`google_gemini`, `vendor_native`) has no supplier form
 * protocol and is deliberately not projected.
 */
const CATALOG_TO_FORM_PROTOCOL = {
  openai_compatible: 'openai_chat_completions',
  openai_responses: 'openai_responses',
  anthropic_messages: 'anthropic_messages',
};

/** Region codes the supplier form offers, in emit order. */
const FORM_REGIONS = ['cn', 'global'];

/**
 * How the router turns a stored Base URL into the URL it actually dials.
 *
 * ---------------------------------------------------------------------------
 * The rule, read off the transport (not guessed)
 * ---------------------------------------------------------------------------
 * Both upstream transports concatenate the Base URL with the inbound path after
 * removing the provider namespace (`/openai` or `/anthropic`):
 *
 *   crates/sdkwork-cloudrouter-edge-runtime/src/passthrough.rs
 *     split_provider_passthrough_path : "/anthropic/v1/messages" -> ("anthropic", "v1/messages")
 *     build_provider_passthrough_uri  : path = "/" + provider_path          (plain concatenation)
 *     build_openai_passthrough_uri    : path = normalize_openai_compatible_path(path)
 *     ProviderPassthroughTarget::build_uri : format!("{}{}", base_url, path)
 *
 * The `/v1` normalisation is applied ONLY on the OpenAI path
 * (`forward_openai` -> `build_openai_passthrough_uri`), and only when the Base
 * URL's own path is `/v1` or ends with `/v1`:
 *
 *   provider_passthrough_transport.rs:72-89
 *     if base_url path == "/v1" || ends_with("/v1") { path.strip_prefix("/v1") }
 *
 * So the operation path per protocol, and whether the `/v1` strip applies:
 *
 *   openai_chat_completions  `/chat/completions`  strip applies
 *   openai_responses         `/responses`         strip applies (relay, same rule:
 *                                                 openai_compatible_relay.rs:274,362)
 *   anthropic_messages       `/v1/messages`       NO strip — the Anthropic SDK
 *                                                 supplies the /v1 itself
 *
 * The consequence this gate exists for: a Base URL that already ends in `/v1`
 * under `anthropic_messages` yields `<base>/v1/v1/messages`. That is exactly the
 * bug the console used to prefill, because a version segment was duplicated into
 * the operator's field.
 */
const OPERATION_PATH = {
  openai_chat_completions: { path: '/chat/completions', stripsVersionPrefix: true },
  openai_responses: { path: '/responses', stripsVersionPrefix: true },
  anthropic_messages: { path: '/v1/messages', stripsVersionPrefix: false },
};

/** The URL the router would dial for a stored Base URL, mirroring the transport. */
function dialedUrl(formProtocol, baseUrl) {
  const spec = OPERATION_PATH[formProtocol];
  if (!spec) return null;
  let path = spec.path;
  let basePath = '';
  try {
    basePath = new URL(baseUrl).pathname.replace(/\/+$/, '');
  } catch {
    return null;
  }
  if (spec.stripsVersionPrefix && (basePath === '/v1' || basePath.endsWith('/v1'))) {
    path = path.replace(/^\/v1(?=\/)/, '') || path;
  }
  return `${baseUrl.replace(/\/+$/, '')}${path}`;
}

/**
 * Reject a Base URL the router would dial into a malformed request.
 *
 * Checked on the *composed* URL rather than on the stored value, because a
 * prefix is only wrong in combination with the operation path a protocol adds.
 */
function dialShapeProblem(formProtocol, baseUrl) {
  const dialed = dialedUrl(formProtocol, baseUrl);
  if (dialed === null) return `cannot parse Base URL ${JSON.stringify(baseUrl)}`;
  const path = new URL(dialed).pathname;
  const duplicated = path.match(/\/(v\d+[a-z]*)\/\1\//);
  if (duplicated) {
    return `the router would dial ${dialed}: the version segment "${duplicated[1]}" appears twice `
      + `(stored Base URL already carries it, and ${formProtocol} adds "${OPERATION_PATH[formProtocol].path}")`;
  }
  if (path.includes('//')) return `the router would dial ${dialed}, which has an empty path segment`;
  return null;
}

/**
 * A "missing version segment" advisory was tried here and removed.
 *
 * The idea was to catch the opposite error class — a stored Base URL that
 * dropped its prefix (the `PREFIX-MISSING` shape the live-database audit
 * `scripts/dev/audit-upstream-dial-url-shape.mjs` measures). It was falsified by
 * the catalog itself: DeepSeek documents its Responses API at the bare origin
 * ("the base_url being `https://api.deepseek.com`", api-docs.deepseek.com
 * /guides/responses_api/), so the rule fired on a correct, documented value.
 * A gate that flags correct data trains people to ignore the gate, so the
 * provable check below is the only one kept. Prefix drift against the live
 * database stays with the audit script, which compares against real rows.
 */

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

/**
 * Collect `models/<vendor>/<region>/vendor.json` into
 * `${vendorCode}\u0000${regionCode}` -> { protocolBaseUrls, nativeApiBaseUrl }.
 */
function collectCatalogEntries(modelsDir) {
  const entries = new Map();
  if (!fs.existsSync(modelsDir)) {
    throw new Error(
      `sdkwork-models catalog not found at ${modelsDir}. Clone ../sdkwork-models next to sdkwork-cloudrouter, `
      + 'or set SDKWORK_MODELS_ROOT.',
    );
  }
  for (const vendorDir of fs.readdirSync(modelsDir, { withFileTypes: true })) {
    if (!vendorDir.isDirectory()) continue;
    const vendorPath = path.join(modelsDir, vendorDir.name);
    for (const regionDir of fs.readdirSync(vendorPath, { withFileTypes: true })) {
      if (!regionDir.isDirectory()) continue;
      const vendorFile = path.join(vendorPath, regionDir.name, 'vendor.json');
      if (!fs.existsSync(vendorFile)) continue;
      const vendor = readJson(vendorFile);
      const vendorCode = vendor.vendorCode ?? vendorDir.name;
      const regionCode = vendor.regionCode ?? regionDir.name;
      entries.set(`${vendorCode}\u0000${regionCode}`, {
        vendorCode,
        regionCode,
        protocolBaseUrls: vendor.protocolBaseUrls ?? {},
        nativeApiBaseUrl: vendor.nativeApiBaseUrl ?? null,
      });
    }
  }
  return entries;
}

/** The vendor codes `/admin/upstream/suppliers` can offer, in catalog sort order. */
function collectFormVendorCodes(resourcesFile) {
  const catalog = readJson(resourcesFile);
  return catalog.items
    .filter((item) => item.resourceType === 'vendor' && typeof item.vendorCode === 'string')
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || left.vendorCode.localeCompare(right.vendorCode))
    .map((item) => item.vendorCode);
}

const baseUrlOf = (endpoint) => (endpoint ? `https://${endpoint.host}${endpoint.pathPrefix ?? ''}` : undefined);

/**
 * Join the two catalogs into the emitted matrix.
 *
 * A vendor the routing catalog offers but the models catalog does not publish
 * (`openai_compatible` is the live example — an aggregator shape, not a model
 * publisher) is emitted with `catalogVendorCode: null` and no protocols, which
 * the form reads as "no official data; leave the operator unrestricted".
 */
function buildMatrix(formVendorCodes, catalogEntries, problems) {
  const matrix = {};
  for (const formVendorCode of formVendorCodes) {
    const declaration = VENDORS_WITHOUT_CATALOG_ADDRESS[formVendorCode];
    if (declaration && CATALOG_VENDOR_CODE_ALIASES[formVendorCode]) {
      problems.push(`${formVendorCode}: listed as both aliased and without a catalog address — remove one of the two declarations`);
    }

    // Identity mapping first, then the explicit alias table for the vendor codes
    // Cloud Router renamed (gemini -> google, volcengine/kling -> their publisher).
    const catalogVendorCode = CATALOG_VENDOR_CODE_ALIASES[formVendorCode] ?? formVendorCode;
    const regions = {};
    let sawAnyRegion = false;
    let sawAnyAddress = false;

    for (const regionCode of FORM_REGIONS) {
      const entry = catalogEntries.get(`${catalogVendorCode}\u0000${regionCode}`);
      if (!entry) continue;
      sawAnyRegion = true;
      const protocols = {};
      for (const [catalogProtocol, endpoint] of Object.entries(entry.protocolBaseUrls)) {
        const formProtocol = CATALOG_TO_FORM_PROTOCOL[catalogProtocol];
        if (!formProtocol) continue;
        const baseUrl = baseUrlOf(endpoint);
        if (!baseUrl) continue;
        // A Base URL is only correct in combination with the operation path the
        // protocol adds, so the verdict comes from the composed dial URL.
        const shapeProblem = dialShapeProblem(formProtocol, baseUrl);
        if (shapeProblem) {
          problems.push(`${formVendorCode}/${regionCode} ${formProtocol}: ${shapeProblem}`);
        }
        protocols[formProtocol] = baseUrl;
      }
      const nativeBaseUrl = baseUrlOf(entry.nativeApiBaseUrl);
      if (Object.keys(protocols).length > 0 || nativeBaseUrl) sawAnyAddress = true;
      // A region the catalog publishes is emitted even when it carries no
      // address (PixVerse mainland China is served on a per-workspace Alibaba
      // Cloud host that cannot be written as a fixed domain). Keeping the node
      // is what stops the console from treating "this region has no published
      // address" as "this vendor only has one region" and prefilling the other
      // region's host into a mainland supplier.
      regions[regionCode] = {
        protocols: Object.fromEntries(Object.entries(protocols).sort(([left], [right]) => left.localeCompare(right))),
        ...(nativeBaseUrl ? { nativeBaseUrl } : {}),
      };
    }

    const matrixEntry = { catalogVendorCode: sawAnyRegion ? catalogVendorCode : null, regions };

    if (!sawAnyRegion) {
      // A vendor with no catalog entry at all is only acceptable when it is
      // declared as such on purpose. Otherwise this is the "someone added a
      // routing vendor and forgot the catalog" case the gate exists to catch.
      if (!declaration || declaration.counterpart) {
        problems.push(
          `${formVendorCode}: no sdkwork-models vendor/region entry for "${catalogVendorCode}". `
          + 'Either map it in tools/lib/cloudrouter-vendor-catalog-aliases.mjs, or declare it in '
          + 'VENDORS_WITHOUT_CATALOG_ADDRESS with a reason.',
        );
      }
    } else if (!sawAnyAddress) {
      // The publisher exists but publishes no dialable official address. That is
      // a legitimate catalog state only when it is declared, and the console
      // needs to be able to say so instead of showing an unexplained empty field.
      if (declaration?.counterpart) {
        matrixEntry.addressUnavailable = declaration.reason;
      } else {
        problems.push(
          `${formVendorCode}: catalog entry "${catalogVendorCode}" publishes neither protocolBaseUrls nor nativeApiBaseUrl — `
          + 'the console cannot prefill any official Base URL for it. Publish the address in sdkwork-models, or declare '
          + 'the vendor in VENDORS_WITHOUT_CATALOG_ADDRESS with a reason.',
        );
      }
    } else if (declaration?.counterpart) {
      problems.push(
        `${formVendorCode}: declared as having no official address, but "${catalogVendorCode}" now publishes one — `
        + 'remove the declaration so the console can prefill it',
      );
    }

    matrix[formVendorCode] = matrixEntry;
  }
  return matrix;
}

/** Deterministic TypeScript, so `--check` is a byte comparison. */
function renderModule(matrix) {
  const lines = [];
  lines.push('// GENERATED FILE — DO NOT EDIT BY HAND.');
  lines.push('//');
  lines.push('// Source of truth: sdkwork-models `models/<vendor>/<region>/vendor.json`');
  lines.push('//   protocolBaseUrls  -> regions[<region>].protocols[<formProtocolCode>]');
  lines.push('//   nativeApiBaseUrl  -> regions[<region>].nativeBaseUrl');
  lines.push('//');
  lines.push('// Regenerate with: pnpm models:vendor-catalog:write');
  lines.push('// Verify with:     pnpm models:vendor-catalog:check');
  lines.push('');
  lines.push("import type { VendorCatalogMatrix } from '../vendorProtocolCatalog.types';");
  lines.push('');
  lines.push('export const VENDOR_CATALOG_MATRIX: VendorCatalogMatrix = {');
  for (const [vendorCode, entry] of Object.entries(matrix)) {
    lines.push(`  ${JSON.stringify(vendorCode)}: {`);
    lines.push(`    catalogVendorCode: ${entry.catalogVendorCode === null ? 'null' : JSON.stringify(entry.catalogVendorCode)},`);
    if (entry.addressUnavailable) {
      lines.push(`    addressUnavailable: ${JSON.stringify(entry.addressUnavailable)},`);
    }
    if (Object.keys(entry.regions).length === 0) {
      lines.push('    regions: {},');
      lines.push('  },');
      continue;
    }
    lines.push('    regions: {');
    for (const [regionCode, region] of Object.entries(entry.regions)) {
      lines.push(`      ${JSON.stringify(regionCode)}: {`);
      lines.push('        protocols: {');
      for (const [protocolCode, baseUrl] of Object.entries(region.protocols)) {
        lines.push(`          ${JSON.stringify(protocolCode)}: ${JSON.stringify(baseUrl)},`);
      }
      lines.push('        },');
      if (region.nativeBaseUrl) {
        lines.push(`        nativeBaseUrl: ${JSON.stringify(region.nativeBaseUrl)},`);
      }
      lines.push('      },');
    }
    lines.push('    },');
    lines.push('  },');
  }
  lines.push('};');
  lines.push('');
  return lines.join('\n');
}

const resourceCatalogFile = path.join(repoRoot, 'data/ai-routing/resources/core-resources.json');
const formVendorCodes = collectFormVendorCodes(resourceCatalogFile);
const catalogEntries = collectCatalogEntries(path.join(modelsRoot, 'models'));

const problems = [];
const matrix = buildMatrix(formVendorCodes, catalogEntries, problems);
const rendered = renderModule(matrix);

const current = fs.existsSync(OUTPUT_PATH) ? fs.readFileSync(OUTPUT_PATH, 'utf8') : null;

if (problems.length > 0) {
  console.error('vendor catalog matrix has unresolved vendors:');
  for (const problem of problems) console.error(`  - ${problem}`);
}

if (check) {
  if (current !== rendered) {
    console.error(`vendor catalog matrix is not current: ${path.relative(repoRoot, OUTPUT_PATH)}`);
    if (current === null) console.error('  the generated module does not exist');
    else console.error('  run: pnpm models:vendor-catalog:write');
    process.exit(1);
  }
  if (problems.length > 0) process.exit(1);
  const vendorCount = Object.keys(matrix).length;
  const protocolCount = Object.values(matrix)
    .reduce((total, entry) => total + Object.values(entry.regions).reduce((sum, region) => sum + Object.keys(region.protocols).length, 0), 0);
  console.log(`vendor catalog matrix is current (${vendorCount} vendors, ${protocolCount} protocol endpoints)`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, rendered, 'utf8');
console.log(`wrote ${path.relative(repoRoot, OUTPUT_PATH)}`);
if (problems.length > 0) process.exit(1);

#!/usr/bin/env node
/**
 * Consistency gate for the vendor-native AI routing chain.
 *
 * Four separate declarations have to agree before a vendor-native request can
 * reach its route account and its price. Each one fails silently on its own, so
 * every check below reports the concrete drift instead of a bare "failed".
 *
 * 1. The `path -> api_code` map exists twice: once in the router service
 *    classifier (`provider_native_classifier.rs`, consulted by the routing
 *    pipeline) and once in the edge runtime passthrough (`passthrough.rs`,
 *    which derives the endpoint key the accounting side resolves). They are
 *    meant to be copies, and the two have already drifted once (`/v1/messages`
 *    was classified but not passed through). A one-sided edit makes the edge
 *    side fall back to a synthesised `<vendor>.<path.with.dots>` key that
 *    matches no seeded resource: no account scope, no price, and the
 *    fail-closed pricing preflight refuses the request.
 *
 * 2. Every api code seeded in `data/ai-routing/resources/*.json` has to be
 *    known to the routing taxonomy. A seed resource the taxonomy cannot name
 *    is unreachable: nothing routes to it, so its group binding and price
 *    never apply.
 *
 * 3. Every path in the open-api contract has to be covered by
 *    `OPEN_API_PREFIXES`. A missing prefix makes `classify_api_surface` return
 *    `Unknown`, and the framework answers 401 `missing_credentials` before the
 *    request reaches routing. `bootstrap.rs` mirrors that list and asserts the
 *    same thing from inside the Rust test suite; this re-runs the check on the
 *    Node side, where it is runnable without a C toolchain.
 *
 * 4. Every arm of the `path -> api_code` map has to be described by a seeded
 *    `api_endpoint`. The router matches the arms above, but `pathTemplate` is
 *    what the resource catalogue persists and displays, so a template naming a
 *    path no arm can produce advertises an entry point that does not exist.
 *    This is the check that caught `anthropic.claude_code` seeded as
 *    `/v1/claude/code` and `gemini.live` as
 *    `/v1beta/models/{model}:liveGenerateContent`.
 *
 * 5. Every vendor-native namespace the gateway contract serves has to be known
 *    to every registry that classifies it — the contract generator's
 *    `VENDOR_PROVIDER_PREFIXES`, the open-api standard-extension sync's
 *    `inferExternalProtocolId` / `isExternalWireProtocolRoute`, and the SDK
 *    runtime standardizer's `infer_external_protocol_id` — and every namespace
 *    has to appear in the contract's `x-sdkwork-vendor-path-prefixes`. A
 *    namespace missing from a classifier falls back to a vendor-relay default
 *    instead of failing, and a namespace missing from the prefix declaration
 *    makes SDK generators mount a vendor-native path under the OpenAI-compatible
 *    prefix (`/v1/kling/v1/videos/avatar`), which the gateway answers with 404.
 *    The namespace list is derived from the contract, so this check cannot
 *    itself drift.
 *
 * 6. No generated API module may mount a vendor-native path under the API
 *    prefix. Check 5 guards the declaration the generators read; this one reads
 *    what they actually emitted, across all nine languages, because a stale
 *    declaration produces a silently wrong path rather than a build error.
 *
 * Usage:
 *   node tools/check-cloudrouter-ai-routing-consistency.mjs [--root <dir>]
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const CLASSIFIER = "services/sdkwork-cloudrouter-router-service/src/application/invocation/provider_native_classifier.rs";
const PASSTHROUGH = "crates/sdkwork-cloudrouter-edge-runtime/src/passthrough.rs";
const TAXONOMY = "services/sdkwork-cloudrouter-router-service/src/application/ai_route_taxonomy.rs";
const SEED_DIR = "data/ai-routing/resources";
const OPEN_API_CONTRACT = "apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json";
const STANDALONE_MAIN = "crates/sdkwork-api-cloudrouter-standalone-gateway/src/main.rs";
const BOOTSTRAP = "crates/sdkwork-api-cloudrouter-assembly/src/bootstrap.rs";
const GATEWAY_CONTRACT = "apps/sdkwork-cloudrouter-pc/public/openapi.json";
const GATEWAY_GENERATOR = "tools/cloudrouter_gateway_openapi_generator.py";
const EXTENSION_SYNC = "tools/sync-cloudrouter-api-standard-extensions.mjs";
const SDK_STANDARDIZER = "tools/cloudrouter_sdk_runtime_standardizer.py";
const SDK_GENERATED_ROOT = "sdks/cloudrouter-open-sdk";

const failures = [];
const notes = [];

function parseRoot(argv) {
  let root = process.cwd();
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--root" && argv[index + 1]) {
      root = resolve(argv[index + 1]);
      index += 1;
    }
  }
  return root;
}

const root = parseRoot(process.argv.slice(2));

function read(relativePath) {
  const absolute = join(root, relativePath);
  if (!existsSync(absolute)) {
    failures.push(`${relativePath}: file is missing`);
    return "";
  }
  return readFileSync(absolute, "utf8");
}

/**
 * Extract the match arms of `provider_native_api_code_from_standard_path` as
 * normalised `provider | condition => api_code` strings, so the two copies can
 * be compared textually without depending on their formatting or on the
 * normalisation helpers each file keeps its own copy of.
 */
function mapArms(source, relativePath) {
  const functionBody = source.match(
    /fn provider_native_api_code_from_standard_path[\s\S]*?\n\}\n/,
  );
  if (!functionBody) {
    failures.push(
      `${relativePath}: cannot find provider_native_api_code_from_standard_path`,
    );
    return [];
  }
  const arms = [];
  const armPattern =
    /"([a-z0-9_.|"]+)"\s*(if\s+([\s\S]*?))?\s*=>\s*"([a-z0-9_.]+)"/g;
  let match;
  while ((match = armPattern.exec(functionBody[0])) !== null) {
    const condition = (match[3] ?? "").replace(/\s+/g, " ").trim();
    arms.push(`${match[1]} | ${condition} => ${match[4]}`);
  }
  return arms;
}

function reportSetDifference(label, left, right) {
  const missing = [...left].filter((entry) => !right.has(entry));
  if (missing.length === 0) return;
  failures.push(`${label} (${missing.length})`);
  for (const entry of missing) failures.push(`    ${entry}`);
}

/**
 * Extract the `path == "<literal>"` arms as structured triples. Predicate arms
 * (`task_query_path_matches`, `gemini_model_action_matches`, ...) match a family
 * of paths rather than one literal, so they cannot be compared textually and are
 * counted separately.
 */
function literalPathArms(source, relativePath) {
  const functionBody = source.match(
    /fn provider_native_api_code_from_standard_path[\s\S]*?\n\}\n/,
  );
  if (!functionBody) return { arms: [], predicateCount: 0 };
  const arms = [];
  const pattern =
    /((?:"[a-z0-9_.]+")(?:\s*\|\s*"[a-z0-9_.]+")*)\s*if\s+path\s*==\s*"([^"]+)"\s*=>\s*"([a-z0-9_.]+)"/g;
  let match;
  while ((match = pattern.exec(functionBody[0])) !== null) {
    const providers = [...match[1].matchAll(/"([a-z0-9_.]+)"/g)].map(
      (entry) => entry[1],
    );
    arms.push({ providers, path: match[2], apiCode: match[3] });
  }
  const allArms = functionBody[0].match(/=>\s*"[a-z0-9_.]+"/g) ?? [];
  return { arms, predicateCount: allArms.length - arms.length };
}

/**
 * Whether a seeded `pathTemplate` describes the same upstream path an arm
 * matches. Arms carrying a provider prefix (`/vidu/ent/v2/template`) are
 * accepted when they end with the seeded template, and `{voice_id}` /
 * `{voiceId}` are treated as the same placeholder.
 */
function pathTemplateCompatible(armPath, template) {
  if (!template) return false;
  if (armPath === template || armPath.endsWith(template)) return true;
  const collapse = (value) => value.replace(/\{[^}]*\}/g, "{}");
  return collapse(armPath) === collapse(template);
}

// ---------------------------------------------------------------------------
// 1. The two copies of the path -> api_code map must stay identical.
// ---------------------------------------------------------------------------

const classifierArms = new Set(mapArms(read(CLASSIFIER), CLASSIFIER));
const passthroughArms = new Set(mapArms(read(PASSTHROUGH), PASSTHROUGH));

if (classifierArms.size > 0 && passthroughArms.size > 0) {
  notes.push(
    `path -> api_code map: classifier ${classifierArms.size} arms, passthrough ${passthroughArms.size} arms`,
  );
  reportSetDifference(
    "classified by the router service but not passed through by the edge runtime",
    classifierArms,
    passthroughArms,
  );
  reportSetDifference(
    "passed through by the edge runtime but not classified by the router service",
    passthroughArms,
    classifierArms,
  );
}

// ---------------------------------------------------------------------------
// 2. Every seeded api code must exist in the routing taxonomy.
// ---------------------------------------------------------------------------

const seedDirectory = join(root, SEED_DIR);
const seededApiCodes = new Set();
const seededEndpoints = [];
if (!existsSync(seedDirectory)) {
  failures.push(`${SEED_DIR}: directory is missing`);
} else {
  const seedFiles = readdirSync(seedDirectory)
    .filter((name) => name.endsWith(".json"))
    .sort();
  for (const name of seedFiles) {
    const relativePath = `${SEED_DIR}/${name}`;
    let document;
    try {
      document = JSON.parse(readFileSync(join(seedDirectory, name), "utf8"));
    } catch (error) {
      failures.push(`${relativePath}: invalid JSON (${error.message})`);
      continue;
    }
    for (const item of document.items ?? []) {
      if (typeof item.apiCode === "string" && item.apiCode.length > 0) {
        seededApiCodes.add(item.apiCode);
      }
      if (item.resourceType === "api_endpoint") {
        seededEndpoints.push({
          apiCode: item.apiCode,
          vendorCode: item.vendorCode,
          pathTemplate: item.pathTemplate,
          method: item.method,
          resourceCode: item.resourceCode,
        });
      }
    }
  }
}

const taxonomySource = read(TAXONOMY);
if (seededApiCodes.size > 0 && taxonomySource.length > 0) {
  const unclassified = [...seededApiCodes]
    .filter((apiCode) => !taxonomySource.includes(`"${apiCode}"`))
    .sort();
  notes.push(
    `seeded api codes: ${seededApiCodes.size} across ${SEED_DIR}, ${unclassified.length} unknown to the taxonomy`,
  );
  if (unclassified.length > 0) {
    failures.push(
      `seeded but absent from ai_route_taxonomy.rs (${unclassified.length}); these resources can never be routed to`,
    );
    for (const apiCode of unclassified) failures.push(`    ${apiCode}`);
  }
}

// ---------------------------------------------------------------------------
// 3. The inbound surface prefixes must cover the open-api contract.
// ---------------------------------------------------------------------------

function stringList(source, pattern) {
  const block = source.match(pattern);
  if (!block) return null;
  return [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

const openApiPrefixes = stringList(
  read(STANDALONE_MAIN),
  /OPEN_API_PREFIXES[^=]*=\s*&\[([\s\S]*?)\];/,
);
const mirroredPrefixes = stringList(
  read(BOOTSTRAP),
  /let open_api_prefixes = \[([\s\S]*?)\][\s\S]*?\.iter\(\)/,
);

if (openApiPrefixes && openApiPrefixes.length > 0) {
  // Mirror of `classify_api_surface`: a path matches when it equals a prefix or
  // sits below it.
  const isOpenApiPath = (path) =>
    openApiPrefixes.some((prefix) =>
      path === prefix || path.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`),
    );

  const contractSource = read(OPEN_API_CONTRACT);
  if (contractSource.length > 0) {
    let contract;
    try {
      contract = JSON.parse(contractSource);
    } catch (error) {
      failures.push(`${OPEN_API_CONTRACT}: invalid JSON (${error.message})`);
    }
    if (contract) {
      const paths = Object.keys(contract.paths ?? {});
      const uncovered = paths.filter((path) => !isOpenApiPath(path)).sort();
      notes.push(
        `open-api contract: ${paths.length} paths, ${uncovered.length} outside OPEN_API_PREFIXES`,
      );
      if (uncovered.length > 0) {
        failures.push(
          `open-api paths that classify_api_surface would reject with 401 missing_credentials (${uncovered.length})`,
        );
        for (const path of uncovered) failures.push(`    ${path}`);
      }
    }
  }

  if (mirroredPrefixes) {
    const standaloneOnly = openApiPrefixes.filter(
      (prefix) => !mirroredPrefixes.includes(prefix),
    );
    const bootstrapOnly = mirroredPrefixes.filter(
      (prefix) => !openApiPrefixes.includes(prefix),
    );
    notes.push(
      `OPEN_API_PREFIXES: standalone gateway ${openApiPrefixes.length}, bootstrap mirror ${mirroredPrefixes.length}`,
    );
    if (standaloneOnly.length > 0 || bootstrapOnly.length > 0) {
      failures.push(
        "the standalone gateway prefix list and its bootstrap.rs mirror disagree",
      );
      for (const prefix of standaloneOnly)
        failures.push(`    only in ${STANDALONE_MAIN}: ${prefix}`);
      for (const prefix of bootstrapOnly)
        failures.push(`    only in ${BOOTSTRAP}: ${prefix}`);
    }
  } else {
    failures.push(
      `${BOOTSTRAP}: cannot find the open_api_prefixes mirror of OPEN_API_PREFIXES`,
    );
  }
} else {
  failures.push(`${STANDALONE_MAIN}: cannot find OPEN_API_PREFIXES`);
}

// ---------------------------------------------------------------------------
// 4. Every literal arm must be described by a seeded api_endpoint.
// ---------------------------------------------------------------------------

// `pathTemplate` does not drive routing — the arms above do — but it is what the
// resource catalogue stores and shows: `ai_routing_seed.rs` upserts it into the
// api_endpoint table and only requires it to start with `/`. A template naming a
// path no arm can produce therefore advertises an entry point that does not
// exist, and that template is what an operator reads when wiring a route
// account. The two have already drifted: `anthropic.claude_code` was seeded as
// `/v1/claude/code` while the arms accept `/v1/claude-code/sessions`, and
// `gemini.live` was seeded as `/v1beta/models/{model}:liveGenerateContent` while
// the arms accept `/v1beta/live/sessions`.
//
// An api code passes when at least one of its arms is described by one of its
// templates: `minimax.music_generation` is reached through three aliases and the
// catalogue only needs to name one of them.

if (seededEndpoints.length > 0) {
  for (const [label, relativePath] of [
    ["passthrough", PASSTHROUGH],
    ["classifier", CLASSIFIER],
  ]) {
    const { arms, predicateCount } = literalPathArms(read(relativePath), relativePath);
    const byApiCode = new Map();
    for (const arm of arms) {
      if (!byApiCode.has(arm.apiCode)) byApiCode.set(arm.apiCode, []);
      byApiCode.get(arm.apiCode).push(arm);
    }
    const undescribed = [];
    const unseeded = [];
    for (const [apiCode, apiArms] of byApiCode) {
      const endpoints = seededEndpoints.filter(
        (endpoint) => endpoint.apiCode === apiCode,
      );
      if (endpoints.length === 0) {
        unseeded.push(apiCode);
        continue;
      }
      const described = apiArms.some((arm) =>
        endpoints.some((endpoint) =>
          pathTemplateCompatible(arm.path, endpoint.pathTemplate),
        ),
      );
      if (!described) {
        undescribed.push(
          `${apiCode}: arms accept ${apiArms
            .map((arm) => arm.path)
            .join(" / ")}; ${SEED_DIR} declares ${endpoints
            .map((endpoint) => endpoint.pathTemplate)
            .join(" / ")}`,
        );
      }
    }
    notes.push(
      `${label}: ${arms.length} literal arms over ${byApiCode.size} api codes, ${predicateCount} predicate arms not comparable`,
    );
    if (unseeded.length > 0) {
      failures.push(
        `${label}: api codes the path map can return but no seeded api_endpoint declares (${unseeded.length})`,
      );
      for (const entry of unseeded.sort()) failures.push(`    ${entry}`);
    }
    if (undescribed.length > 0) {
      failures.push(
        `${label}: seeded pathTemplate describes a path these arms cannot produce (${undescribed.length}); the catalogue advertises an entry point that does not exist`,
      );
      for (const entry of undescribed.sort()) failures.push(`    ${entry}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Every vendor-native namespace has to be known to every registry that
//    classifies it.
//
// Four declarations answer "which vendor does this path belong to", and a
// namespace missing from one of them is silently *misclassified* rather than
// rejected, so nothing surfaces until an operator reads the generated SDK or
// the materialised contract:
//
//   VENDOR_PROVIDER_PREFIXES      gateway contract generator: an unlisted
//                                 namespace fails its own vendor schema quality
//                                 audit, so the contract cannot be regenerated
//   inferExternalProtocolId       open-api standard-extension sync: falls back
//                                 to `cloudrouter-vendor-relay`
//   isExternalWireProtocolRoute   the same sync: the route is classified as
//                                 SDKWork-envelope business traffic instead of
//                                 an external wire protocol
//   infer_external_protocol_id    SDK runtime standardizer: falls back to
//                                 `cloudrouter-vendor-relay`
//
// This is not hypothetical: `minimax` was absent from all four while the
// contract already served `/minimax/v1/music_generation`, so that operation
// carried no standard extensions at all in `apis/**`; `elevenlabs` was absent
// from the standardizer, so `/elevenlabs/v1/sound-generation` was labelled
// `cloudrouter-vendor-relay` in `sdks/**`.
//
// The namespace list is *derived* from the gateway contract instead of being
// declared here, so this check cannot itself drift.
// ---------------------------------------------------------------------------

function stringLiterals(source, pattern) {
  const block = source.match(pattern);
  if (!block) return null;
  // `[^"\n()]` keeps the match inside one line and one literal: a plain
  // `"([^"]+)"` scan straddles literals as soon as an empty `""` or an escaped
  // quote shifts the pairing, which silently yields the text *between* two
  // literals instead of the literal itself.
  return [...block[0].matchAll(/"([^"\n()]+)"/g)].map((match) => match[1]);
}

/** Top-level path segments the contract serves outside the OpenAI-compatible prefix. */
function namespacesOutsidePrefix(contract, apiPrefix) {
  const segment = String(apiPrefix ?? "").replace(/^\/+|\/+$/g, "");
  const found = new Set();
  for (const path of Object.keys(contract.paths ?? {})) {
    const first = path.split("/").filter(Boolean)[0];
    if (!first || first === segment) continue;
    found.add(first);
  }
  return [...found].sort();
}

const SDK_SOURCE_EXTENSIONS = [
  ".rs",
  ".ts",
  ".go",
  ".py",
  ".cs",
  ".java",
  ".kt",
  ".swift",
  ".dart",
];

/**
 * Every generated API module under `directory`, skipping the trees that hold
 * generator bookkeeping (`/.sdkwork/`) or installed dependencies rather than
 * emitted call sites.
 */
function* walkSdkSourceFiles(directory) {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".sdkwork" ||
        entry.name === "dist" ||
        entry.name === "build"
      ) {
        continue;
      }
      yield* walkSdkSourceFiles(entryPath);
      continue;
    }
    if (
      entry.isFile() &&
      SDK_SOURCE_EXTENSIONS.some((extension) => entry.name.endsWith(extension))
    ) {
      yield entryPath;
    }
  }
}

const gatewayContractSource = read(GATEWAY_CONTRACT);
if (gatewayContractSource.length > 0) {
  let gatewayContract;
  try {
    gatewayContract = JSON.parse(gatewayContractSource);
  } catch (error) {
    failures.push(`${GATEWAY_CONTRACT}: invalid JSON (${error.message})`);
  }
  if (gatewayContract) {
    const apiPrefix = gatewayContract["x-api-prefix"];
    const declared = gatewayContract["x-sdkwork-vendor-path-prefixes"];
    if (apiPrefix !== "/v1") {
      failures.push(
        `${GATEWAY_CONTRACT}: x-api-prefix is ${JSON.stringify(apiPrefix)}, expected "/v1"`,
      );
    }
    if (!Array.isArray(declared)) {
      failures.push(
        `${GATEWAY_CONTRACT}: x-sdkwork-vendor-path-prefixes is missing; SDK generators apply x-api-prefix to vendor-native paths without it`,
      );
    } else {
      const namespaces = namespacesOutsidePrefix(gatewayContract, apiPrefix);
      const declaredSet = new Set(declared);
      const undeclared = namespaces.filter((entry) => !declaredSet.has(entry));
      const phantom = [...declaredSet].filter(
        (entry) => !namespaces.includes(entry),
      );
      notes.push(
        `gateway contract: ${namespaces.length} vendor-native namespaces, x-sdkwork-vendor-path-prefixes declares ${declared.length}`,
      );
      if (undeclared.length > 0) {
        failures.push(
          `vendor-native namespaces the contract serves but x-sdkwork-vendor-path-prefixes omits (${undeclared.length}); SDK generators would emit them under ${JSON.stringify(apiPrefix)}`,
        );
        for (const entry of undeclared) failures.push(`    /${entry}/...`);
      }
      if (phantom.length > 0) {
        failures.push(
          `x-sdkwork-vendor-path-prefixes names namespaces the contract does not serve (${phantom.length})`,
        );
        for (const entry of phantom) failures.push(`    ${entry}`);
      }

      const registries = [
        [
          "gateway contract generator VENDOR_PROVIDER_PREFIXES",
          GATEWAY_GENERATOR,
          stringLiterals(
            read(GATEWAY_GENERATOR),
            /VENDOR_PROVIDER_PREFIXES\s*=\s*\{[\s\S]*?\}/,
          ),
        ],
        [
          "open-api extension sync inferExternalProtocolId",
          EXTENSION_SYNC,
          stringLiterals(
            read(EXTENSION_SYNC),
            /function inferExternalProtocolId\(routePath\)\s*\{[\s\S]*?\n\}/,
          )?.map((literal) => literal.replace(/^\/|\/$/g, "")),
        ],
        [
          "open-api extension sync isExternalWireProtocolRoute",
          EXTENSION_SYNC,
          stringLiterals(
            read(EXTENSION_SYNC),
            /function isExternalWireProtocolRoute\(routePath\)\s*\{[\s\S]*?\n\}/,
          )?.map((literal) => literal.replace(/^\/|\/$/g, "")),
        ],
        [
          "SDK runtime standardizer infer_external_protocol_id",
          SDK_STANDARDIZER,
          stringLiterals(
            read(SDK_STANDARDIZER),
            /def infer_external_protocol_id\(route_path: str\) -> str:[\s\S]*?return "cloudrouter-vendor-relay"/,
          )?.map((literal) => literal.replace(/^\/|\/$/g, "")),
        ],
      ];

      for (const [label, relativePath, literals] of registries) {
        if (!literals) {
          failures.push(
            `${relativePath}: cannot find the ${label} vendor registry`,
          );
          continue;
        }
        const known = new Set(literals);
        const unknown = namespaces.filter((entry) => !known.has(entry));
        notes.push(
          `${label}: ${literals.length} namespaces, ${unknown.length} contract namespaces unknown`,
        );
        if (unknown.length > 0) {
          failures.push(
            `${relativePath}: ${label} does not know ${unknown.length} namespace(s) the contract serves; they fall back to the vendor-relay default`,
          );
          for (const entry of unknown) failures.push(`    /${entry}/...`);
        }
      }

      if (openApiPrefixes && openApiPrefixes.length > 0) {
        const unclassifiable = namespaces.filter(
          (entry) =>
            !openApiPrefixes.some(
              (prefix) => prefix === `/${entry}` || prefix.startsWith(`/${entry}/`),
            ),
        );
        if (unclassifiable.length > 0) {
          failures.push(
            `${STANDALONE_MAIN}: ${unclassifiable.length} contract namespace(s) no OPEN_API_PREFIXES entry covers; classify_api_surface would answer 401 missing_credentials`,
          );
          for (const entry of unclassifiable) failures.push(`    /${entry}/...`);
        }
      }

      // 6. No generated API module may mount a vendor-native path under the API
      //    prefix.
      //
      //    `x-sdkwork-vendor-path-prefixes` exists so generators skip the prefix
      //    helper for those namespaces. When the declaration is absent (or a
      //    generator ignores it) the emitted call is
      //    `/v1/kling/v1/videos/avatar`; `invocation_http` classifies every
      //    `/v1/...` path as an OpenAI-compatible request, so the
      //    provider-native arm is never reached and the gateway answers 404.
      //    The contract-side half is check 5; this half reads the shipped
      //    sources, because in most languages a wrong path stays a silent
      //    runtime failure instead of a build error.
      const sdkRoot = join(root, SDK_GENERATED_ROOT);
      if (existsSync(sdkRoot)) {
        const prefixSegment = String(apiPrefix ?? "/v1").replace(/^\/+|\/+$/g, "");
        const offenders = [];
        let scanned = 0;
        for (const filePath of walkSdkSourceFiles(sdkRoot)) {
          scanned += 1;
          const source = readFileSync(filePath, "utf8");
          for (const namespace of namespaces) {
            const needle = `/${prefixSegment}/${namespace}/`;
            if (source.includes(needle)) {
              offenders.push(
                `${relative(root, filePath).replace(/\\/g, "/")}: ${needle}`,
              );
            }
          }
        }
        notes.push(
          `generated SDKs: ${scanned} source files scanned, ${offenders.length} prepend ${JSON.stringify(apiPrefix)} to a vendor-native path`,
        );
        if (offenders.length > 0) {
          failures.push(
            `${offenders.length} generated call site(s) mount a vendor-native path under ${JSON.stringify(apiPrefix)}; the gateway classifies those as OpenAI-compatible requests and answers 404`,
          );
          for (const entry of offenders.slice(0, 20)) failures.push(`    ${entry}`);
          if (offenders.length > 20) {
            failures.push(`    ... and ${offenders.length - 20} more`);
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

for (const note of notes) console.log(`  ${note}`);

if (failures.length > 0) {
  console.error("");
  console.error("ai-routing-consistency: FAILED");
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log("");
console.log("ai-routing-consistency: passed");

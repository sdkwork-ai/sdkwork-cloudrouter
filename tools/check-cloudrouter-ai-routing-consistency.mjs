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
 *    path no arm can answer advertises an entry point that does not exist.
 *    This is the check that caught `anthropic.claude_code` seeded as
 *    `/v1/claude/code` and `gemini.live` as
 *    `/v1beta/models/{model}:liveGenerateContent`.
 *
 *    Every arm is *evaluated* here, predicate arms included. Comparing the
 *    literal arms only — and reporting the rest as "not comparable" — is what
 *    let the same defect survive three more times: `gemini.image_generation` and
 *    `gemini.nano_banana.image_generation` both advertised
 *    `/v1beta/models/{model}:predict` and `kling.task_query` advertised
 *    `/v1/videos/{taskId}`, while the arms answer `:generateImages` (the
 *    nano-banana branch additionally needing the `/nano-banana:` model segment)
 *    and `/v1/videos/generations/{task_id}`. All three are now red when
 *    reintroduced. An arm shape this gate cannot model is a hard failure, so it
 *    can never go back to silently skipping.
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
 * 7. Every vendor-native operation the open-api contract publishes has to be
 *    routable: an arm for the path, a taxonomy route for the api code, and a
 *    seeded `api_endpoint` for it. The contract is the published ingress, so a
 *    caller driving the generated SDK sends exactly these paths, and a path
 *    that any link in that chain cannot name fails closed with `50201 no
 *    upstream account routes are configured` — a message that names neither the
 *    path nor the missing link. Checks 1-6 all passed while 30 of the 47
 *    published vendor-native operations were in that state.
 *
 *    A namespace may legitimately be declared ahead of its routing support, so
 *    the check carries an exact unrouted ledger: an operation that is published
 *    but unroutable has to be declared with a reason, an operation that becomes
 *    routable has to leave the ledger, and a ledger entry the contract no longer
 *    publishes has to be deleted. The ledger therefore cannot grow silently or
 *    rot into a permanent excuse.
 *
 * 8. Every vendor- or modality-scoped resource group has to grant exactly the
 *    seeded `api_endpoint` resources its own name claims. Groups are the last
 *    link of the chain — routing resolves an api code, but an account only
 *    reaches it if a group it belongs to grants the resource. `api.kling.all`
 *    ("All Kling API resources") granted 4 of Kling's 6 seeded endpoints, and
 *    the two it omitted are the ones the digital-human and motion-control
 *    features are driven by, so an admin-API account got `50201 no upstream
 *    account routes are configured` for capabilities the group name promised.
 *    The expected set is derived from the seeds, so the check cannot drift.
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
// The `path -> api_code` map, as a model the gate can *evaluate*
// ---------------------------------------------------------------------------
//
// Checks 4 and 7 need to answer "which api code does the gateway resolve for
// this path", not "which literal strings appear in the source". Comparing only
// the literal arms is what let three seeded `pathTemplate`s drift: with the
// predicate arms dismissed as "not comparable", nothing noticed that
// `gemini.image_generation` and `gemini.nano_banana.image_generation` both
// advertised `/v1beta/models/{model}:predict` and `kling.task_query` advertised
// `/v1/videos/{taskId}` — no arm can produce any of those three paths.
//
// So every arm is parsed into a shape, and a shape the gate cannot model is a
// hard failure rather than a silent skip: an arm nobody can read is an arm
// whose drift nobody notices.

const GEMINI_MODELS_PREFIX = "/v1beta/models/";
const NANO_BANANA_MARKER = "/nano-banana:";

/** The poll helpers, and the family each one pins. */
const POLL_HELPERS = {
  task_query_path_matches: "v1/tasks",
  music_task_query_path_matches: "v1/music/generations",
};

function parsePathArms(source, relativePath) {
  const label = `${relativePath}: provider_native_api_code_from_standard_path`;
  const functionBody = source.match(
    /fn provider_native_api_code_from_standard_path[\s\S]*?\n\}\n/,
  );
  if (!functionBody) {
    failures.push(`${label}: function not found`);
    return null;
  }
  const block = functionBody[0].match(
    /let api_code = match provider\.as_str\(\) \{([\s\S]*?)\n {4}\};/,
  );
  if (!block) {
    failures.push(`${label}: cannot isolate the api_code match block`);
    return null;
  }
  // rustfmt puts every arm at the same indent and the catch-all at `        _`,
  // so a lookahead split yields exactly one chunk per arm — including the
  // block-bodied ones, whose continuation lines sit deeper.
  const chunks = block[1]
    .split(/\n(?= {8}["_])/)
    .map((chunk) => chunk.replace(/\s+/g, " ").trim())
    .filter((chunk) => chunk.length > 0)
    .filter((chunk) => !chunk.startsWith("_ "));

  const arms = [];
  const unknown = [];
  for (const chunk of chunks) {
    const providerPart = chunk.match(
      /^((?:"[^"]+")(?:\s*\|\s*"[^"]+")*)\s*if\s+([\s\S]*)$/,
    );
    if (!providerPart) {
      unknown.push(chunk);
      continue;
    }
    const providers = [...providerPart[1].matchAll(/"([^"]+)"/g)].map(
      (entry) => entry[1],
    );
    // rustfmt wraps a long body in a block and every arm carries a trailing
    // comma; normalise both away so one shape pattern covers both spellings.
    const condition = providerPart[2]
      .replace(/\s+/g, " ")
      .trim()
      .replace(/,$/, "")
      .replace(/=> \{ "([^"]+)" \}$/, '=> "$1"');

    let shape = condition.match(/^path == "([^"]+)" => "([^"]+)"$/);
    if (shape) {
      arms.push({
        providers,
        kind: "literal",
        path: shape[1],
        apiCode: shape[2],
      });
      continue;
    }

    shape = condition.match(/^path\.starts_with\("([^"]+)"\) => "([^"]+)"$/);
    if (shape) {
      arms.push({
        providers,
        kind: "pathPrefix",
        prefix: shape[1],
        apiCode: shape[2],
      });
      continue;
    }

    shape = condition.match(
      /^gemini_model_action_matches\(path\.as_str\(\), "([^"]+)"\) => "([^"]+)"$/,
    );
    if (shape) {
      arms.push({
        providers,
        kind: "geminiAction",
        action: shape[1],
        apiCode: shape[2],
      });
      continue;
    }

    shape = condition.match(
      /^gemini_model_action_matches\(path\.as_str\(\), "([^"]+)"\) => \{ if path\.contains\("([^"]+)"\) \{ "([^"]+)" \} else \{ "([^"]+)" \} \}$/,
    );
    if (shape) {
      arms.push({
        providers,
        kind: "geminiAction",
        action: shape[1],
        branch: { contains: shape[2], apiCode: shape[3] },
        apiCode: shape[4],
      });
      continue;
    }

    shape = condition.match(
      /^task_poll_path_matches\(path\.as_str\(\), "([^"]+)"\) => "([^"]+)"$/,
    );
    if (shape) {
      arms.push({
        providers,
        kind: "poll",
        family: shape[1],
        apiCode: shape[2],
      });
      continue;
    }

    shape = condition.match(
      /^([A-Za-z_][A-Za-z0-9_]*)\(path\.as_str\(\)\) => "([^"]+)"$/,
    );
    if (shape && POLL_HELPERS[shape[1]]) {
      arms.push({
        providers,
        kind: "poll",
        family: POLL_HELPERS[shape[1]],
        apiCode: shape[2],
      });
      continue;
    }

    unknown.push(chunk);
  }

  if (unknown.length > 0) {
    failures.push(
      `${label}: ${unknown.length} arm(s) this gate cannot model; extend the gate instead of leaving them unchecked`,
    );
    for (const chunk of unknown) failures.push(`    ${chunk}`);
    return null;
  }
  return arms;
}

function normalizeProviderMatchKey(value) {
  return String(value)
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase()
    .replace(/[/:-]/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function normalizeProviderApiPath(supplierCode, matchKey, standardPath) {
  const raw = String(standardPath).trim();
  const path = (raw.startsWith("/") ? raw : `/${raw}`).toLowerCase();
  const supplierPrefix = `/${String(supplierCode)
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase()}/`;
  if (path.startsWith(supplierPrefix)) return `/${path.slice(supplierPrefix.length)}`;
  const keyPrefix = `/${matchKey}/`;
  if (path.startsWith(keyPrefix)) return `/${path.slice(keyPrefix.length)}`;
  return path;
}

/** The single path an arm's `path == "<literal>"` / poll / action shape pins, for template comparison. */
function armPinnedPaths(arm) {
  switch (arm.kind) {
    case "literal":
      return [arm.path];
    case "pathPrefix":
      return [`${arm.prefix}{value}`];
    case "geminiAction":
      return arm.branch
        ? [
            `${GEMINI_MODELS_PREFIX}{model}:${arm.action}`,
            `${GEMINI_MODELS_PREFIX}nano-banana:${arm.action}`,
          ]
        : [`${GEMINI_MODELS_PREFIX}{model}:${arm.action}`];
    case "poll":
      return [`/${arm.family}/{task_id}`, `/${arm.family}/task_abc123`];
    default:
      return [];
  }
}

/**
 * Whether `template` names a path this arm answers *for this api code*.
 * Evaluated, not text-matched, and branch-aware: the `:generateImages` arm is one
 * arm with two api codes, and only its `/nano-banana:` branch answers
 * `gemini.nano_banana.image_generation` — so a template naming the nano-banana
 * model must not pass for the plain `gemini.image_generation` entry, which is
 * how the two used to share the unreachable `/v1beta/models/{model}:predict`.
 */
function armAnswersTemplate(arm, template, apiCode) {
  if (!template) return false;
  const collapse = (value) => value.replace(/\{[^}]*\}/g, "{}");
  switch (arm.kind) {
    case "literal":
      return pathTemplateCompatible(arm.path, template);
    case "pathPrefix":
      return template.startsWith(arm.prefix);
    case "poll": {
      const prefix = `/${arm.family}/`;
      if (!template.toLowerCase().startsWith(prefix)) return false;
      const tail = template.slice(prefix.length);
      return tail.length > 0 && !tail.includes("/");
    }
    case "geminiAction": {
      const lower = template.toLowerCase();
      if (!lower.startsWith(GEMINI_MODELS_PREFIX)) return false;
      if (!lower.endsWith(`:${arm.action}`)) return false;
      const nanoModel =
        lower.includes(NANO_BANANA_MARKER) ||
        lower.startsWith(`${GEMINI_MODELS_PREFIX}nano-banana:`);
      if (arm.branch) {
        return apiCode === arm.branch.apiCode ? nanoModel : !nanoModel;
      }
      return !nanoModel;
    }
    default:
      return collapse("") === collapse(template);
  }
}

/** Mirror of the Rust `match`: first arm whose provider and condition both match. */
function resolveApiCode(arms, supplierCode, standardPath) {
  const matchKey = normalizeProviderMatchKey(supplierCode);
  const path = normalizeProviderApiPath(supplierCode, matchKey, standardPath);
  for (const arm of arms) {
    if (!arm.providers.includes(matchKey)) continue;
    let hit = false;
    switch (arm.kind) {
      case "literal":
        hit = path === arm.path;
        break;
      case "pathPrefix":
        hit = path.startsWith(arm.prefix);
        break;
      case "geminiAction":
        hit =
          path.startsWith(GEMINI_MODELS_PREFIX) &&
          path.endsWith(`:${arm.action}`);
        break;
      case "poll": {
        const prefix = `/${arm.family}/`;
        hit =
          path === `/${arm.family}/{task_id}` ||
          (path.startsWith(prefix) &&
            path.slice(prefix.length).trim().length > 0);
        break;
      }
      default:
        hit = false;
    }
    if (!hit) continue;
    if (arm.branch && path.includes(arm.branch.contains)) return arm.branch.apiCode;
    return arm.apiCode;
  }
  return null;
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
          modalityCode: item.modalityCode,
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
// 4. Every arm must be described by a seeded api_endpoint.
// ---------------------------------------------------------------------------
//
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
// Literal arms only used to be compared, and the predicate arms were reported as
// "not comparable" — which is where the same defect survived three more times:
// `gemini.image_generation` and `gemini.nano_banana.image_generation` both
// advertised `/v1beta/models/{model}:predict` (the image arm answers
// `:generateImages`, and the nano-banana branch additionally needs the model
// segment `/nano-banana:`), and `kling.task_query` advertised
// `/v1/videos/{taskId}` while the poll arms answer `/v1/tasks/{taskId}` and
// `/v1/videos/generations/{task_id}`. Every arm is now evaluated.
//
// An api code passes when at least one of its arms is described by one of its
// templates: `minimax.music_generation` is reached through three aliases and the
// catalogue only needs to name one of them.

const parsedArmsByCopy = new Map();

if (seededEndpoints.length > 0) {
  for (const [label, relativePath] of [
    ["passthrough", PASSTHROUGH],
    ["classifier", CLASSIFIER],
  ]) {
    const arms = parsePathArms(read(relativePath), relativePath);
    if (!arms) continue;
    parsedArmsByCopy.set(label, arms);
    const byApiCode = new Map();
    for (const arm of arms) {
      for (const apiCode of [arm.apiCode, arm.branch?.apiCode].filter(Boolean)) {
        if (!byApiCode.has(apiCode)) byApiCode.set(apiCode, []);
        byApiCode.get(apiCode).push(arm);
      }
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
          armAnswersTemplate(arm, endpoint.pathTemplate, apiCode),
        ),
      );
      if (!described) {
        undescribed.push(
          `${apiCode}: arms answer ${apiArms
            .flatMap((arm) => armPinnedPaths(arm))
            .join(" / ")}; ${SEED_DIR} declares ${endpoints
            .map((endpoint) => endpoint.pathTemplate)
            .join(" / ")}`,
        );
      }
    }
    notes.push(
      `${label}: ${arms.length} arms over ${byApiCode.size} api codes, all evaluated`,
    );
    if (unseeded.length > 0) {
      failures.push(
        `${label}: api codes the path map can return but no seeded api_endpoint declares (${unseeded.length})`,
      );
      for (const entry of unseeded.sort()) failures.push(`    ${entry}`);
    }
    if (undescribed.length > 0) {
      failures.push(
        `${label}: seeded pathTemplate describes a path these arms cannot answer (${undescribed.length}); the catalogue advertises an entry point that does not exist`,
      );
      for (const entry of undescribed.sort()) failures.push(`    ${entry}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 7. Every vendor-native operation the open-api contract publishes has to be
//    routable.
// ---------------------------------------------------------------------------
//
// The contract is the gateway's published ingress: a caller that drives the
// generated SDK sends exactly these paths. The chain that turns an ingress path
// into an upstream call is one arm (path -> api_code) plus one taxonomy route
// plus one seeded api_endpoint plus one account-group grant. A path that any of
// those cannot name fails closed with `50201 no upstream account routes are
// configured` — an error that names neither the path nor the missing link, so
// nothing surfaces it until a caller hits it in production.
//
// This is not hypothetical. The image adapter of `sdkwork-generations`
// (`sdkwork-generations-provider-adapter/src/gateway.rs`) drives the generated
// open SDK, so it sends `/nano-banana/v1/images/generations`,
// `/vidu/ent/v2/text2video`, `/vidu/ent/v2/img2video`,
// `/vidu/ent/v2/tasks/{task_id}/creations` and
// `/volcengine/api/v3/contents/generations/tasks` — every one of them published
// by the contract and, before this check existed, every one of them nameable by
// no arm.
//
// Unrouted operations cannot be silently accepted either: a namespace may be
// declared ahead of its routing support, but then it has to be *declared here*
// with a reason, and the ledger is exact — an allowlisted operation that
// becomes routable fails the check until it is removed, so the ledger cannot
// rot into a permanent excuse.

/** `"<METHOD> <path>"` -> why the gateway cannot route it yet. */
const DECLARED_UNROUTED_OPERATIONS = new Map();

function declareUnrouted(operations, reason) {
  for (const operation of operations) {
    DECLARED_UNROUTED_OPERATIONS.set(operation, reason);
  }
}

// Anthropic's and Google's utility surfaces. None of these has a taxonomy route,
// an api_endpoint seed, an account-group resource grant or a price, and none is
// billed on the per-generation meters: `count_tokens` / `countTokens` are free at
// the vendor and files / batches / cachedContents are storage and job control.
// Wiring them is a pricing and product decision, so they are declared rather
// than invented.
declareUnrouted(
  [
    "GET /anthropic/v1/files",
    "POST /anthropic/v1/files",
    "GET /anthropic/v1/files/{file_id}",
    "DELETE /anthropic/v1/files/{file_id}",
    "GET /anthropic/v1/files/{file_id}/content",
    "POST /anthropic/v1/messages/batches",
    "GET /anthropic/v1/messages/batches",
    "GET /anthropic/v1/messages/batches/{batch_id}",
    "POST /anthropic/v1/messages/batches/{batch_id}/cancel",
    "POST /anthropic/v1/messages/count_tokens",
    "GET /google/v1beta/cachedContents",
    "POST /google/v1beta/cachedContents",
    "GET /google/v1beta/cachedContents/{cached_content_id}",
    "DELETE /google/v1beta/cachedContents/{cached_content_id}",
    "GET /google/v1beta/files",
    "POST /google/v1beta/files",
    "GET /google/v1beta/files/{file_id}",
    "DELETE /google/v1beta/files/{file_id}",
    "POST /google/v1beta/models/{model}:batchEmbedContents",
    "POST /google/v1beta/models/{model}:countTokens",
  ],
  "vendor utility surface: no taxonomy route, no api_endpoint seed, no resource grant, no price",
);

// `midjourney` and `nano-banana` publish a namespace but have no
// `ai_upstream_supplier`, no `ai_model_vendor` and no bundled account, so no
// routing support can exist yet.
declareUnrouted(
  [
    "POST /midjourney/v1/images/generations",
    "GET /midjourney/v1/images/generations/{task_id}",
  ],
  "no supplier/vendor/account: generations dispatches the midjourney slug through the OpenAI-compatible image surface instead",
);
declareUnrouted(
  [
    "POST /nano-banana/v1/images/generations",
    "GET /nano-banana/v1/images/generations/{task_id}",
  ],
  "no supplier/vendor/account, and the wired nano-banana ingress is the Gemini-native /google/v1beta/models/nano-banana:generateImages — but `dispatch_nano_banana` in sdkwork-generations drives THIS path, so it is a live cross-repo breakage (API authority ambiguity), not something an arm can paper over",
);

// Vidu: the published paths are Vidu's own (`https://api.vidu.cn/ent/v2/...`) and
// the generation adapter calls three of them, but the taxonomy only names
// `vidu.reference_to_image`, `vidu.start_end_to_video` and `vidu.motion_sync`, so
// the video verbs have no route to resolve to. Unlike the volcengine case there
// is no existing api code to reuse: each needs a taxonomy route, a seed, a
// resource grant and a price.
declareUnrouted(
  [
    "POST /vidu/ent/v2/text2video",
    "POST /vidu/ent/v2/img2video",
    "POST /vidu/ent/v2/reference2video",
    "GET /vidu/ent/v2/tasks/{task_id}/creations",
  ],
  "published and called by sdkwork-generations, but the taxonomy names no vidu video route",
);

const openApiContractSource = read(OPEN_API_CONTRACT);
if (openApiContractSource.length > 0 && parsedArmsByCopy.has("classifier")) {
  let openApiContract;
  try {
    openApiContract = JSON.parse(openApiContractSource);
  } catch (error) {
    failures.push(`${OPEN_API_CONTRACT}: invalid JSON (${error.message})`);
  }
  if (openApiContract) {
    const prefixes = Array.isArray(
      openApiContract["x-sdkwork-vendor-path-prefixes"],
    )
      ? openApiContract["x-sdkwork-vendor-path-prefixes"]
      : [];
    const arms = parsedArmsByCopy.get("classifier");
    const unrouted = [];
    const routable = [];
    const seen = new Set();
    for (const [path, operations] of Object.entries(openApiContract.paths ?? {})) {
      const namespace = path.split("/").filter(Boolean)[0];
      if (!prefixes.includes(namespace)) continue;
      const standardPath = `/${path.split("/").filter(Boolean).slice(1).join("/")}`;
      for (const method of Object.keys(operations)) {
        const operation = `${method.toUpperCase()} ${path}`;
        seen.add(operation);
        const apiCode = resolveApiCode(arms, namespace, standardPath);
        const knownToTaxonomy =
          apiCode !== null && taxonomySource.includes(`"${apiCode}"`);
        const seeded =
          apiCode !== null &&
          seededEndpoints.some((endpoint) => endpoint.apiCode === apiCode);
        if (apiCode !== null && knownToTaxonomy && seeded) {
          routable.push(`${operation} -> ${apiCode}`);
          if (DECLARED_UNROUTED_OPERATIONS.has(operation)) {
            failures.push(
              `${operation} is now routable (${apiCode}) but is still declared unrouted in this check; delete its entry`,
            );
          }
          continue;
        }
        unrouted.push(operation);
        if (!DECLARED_UNROUTED_OPERATIONS.has(operation)) {
          failures.push(
            `${operation} is published by the contract but the gateway cannot route it (${apiCode ?? "no arm matches"}${knownToTaxonomy ? "" : ", no taxonomy route"}${seeded ? "" : ", no seeded api_endpoint"}); wire it or declare it in this check's unrouted ledger`,
          );
        }
      }
    }
    for (const declared of DECLARED_UNROUTED_OPERATIONS.keys()) {
      if (!seen.has(declared)) {
        failures.push(
          `${declared} is declared unrouted in this check but the contract does not publish it; delete the stale entry`,
        );
      }
    }
    notes.push(
      `open-api vendor-native surface: ${routable.length} operation(s) routed, ${unrouted.length} declared unrouted`,
    );
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
// 8. A resource group's name has to describe its contents.
// ---------------------------------------------------------------------------
//
// Resource groups are how an operator grants a whole vendor — or a whole
// modality of one vendor — to an account group, and each account family is
// granted through its own set: `official.*.full` for official provider
// accounts, `api.<vendor>.all` / `api.<vendor>.<modality>` for admin-API
// accounts, `relay.*` for relay accounts.
//
// Nothing checked that a group's items matched its own name, and they had
// drifted: `api.kling.all` ("All Kling API resources") granted 4 of Kling's 6
// seeded `api_endpoint` resources — omitting `api.kling.avatar` and
// `api.kling.motion_control` — and `api.kling.video` omitted the same two,
// while `api.vidu.video` omitted `api.vidu.motion_sync`. An admin-API account
// was therefore granted every Kling video API except the digital-human and
// motion-control endpoints the product is driven by, and the refusal names
// neither the group nor the resource: routing answers
// `50201 no upstream account routes are configured`.
//
// The invariant is derived from the seeds rather than declared here, so this
// check cannot itself drift: `<family>.<vendor>.all` / `<family>.<vendor>.full`
// must grant every seeded `api_endpoint` of that vendor, and
// `<family>.<vendor>.<modality>` must grant every seeded `api_endpoint` of that
// vendor whose `modalityCode` is that modality. A three-segment group whose
// scope segment names neither a seeded vendor nor a seeded modality is not
// vendor- or modality-scoped — it is a curated list such as
// `relay.openai_compatible.media` — so it is counted as skipped instead of
// being guessed at.

const GROUP_DIR = "data/ai-routing/resource-groups";
const groupDirectory = join(root, GROUP_DIR);
if (!existsSync(groupDirectory)) {
  failures.push(`${GROUP_DIR}: directory is missing`);
} else {
  const groupFiles = readdirSync(groupDirectory)
    .filter((name) => name.endsWith(".json"))
    .sort();
  let checkedGroups = 0;
  let skippedGroups = 0;
  for (const name of groupFiles) {
    const relativePath = `${GROUP_DIR}/${name}`;
    let document;
    try {
      document = JSON.parse(readFileSync(join(groupDirectory, name), "utf8"));
    } catch (error) {
      failures.push(`${relativePath}: invalid JSON (${error.message})`);
      continue;
    }
    for (const group of document.items ?? []) {
      const groupCode = String(group.groupCode ?? "");
      const segments = groupCode.split(".");
      if (segments.length !== 3) continue;
      const [, vendorCode, scope] = segments;
      const vendorScoped = scope === "all" || scope === "full";
      const expected = seededEndpoints.filter(
        (endpoint) =>
          endpoint.vendorCode === vendorCode &&
          (vendorScoped || endpoint.modalityCode === scope),
      );
      if (expected.length === 0) {
        skippedGroups += 1;
        continue;
      }
      checkedGroups += 1;
      const granted = new Set(
        (group.items ?? [])
          .filter((item) => item.itemType === "resource")
          .map((item) => item.resourceCode),
      );
      const missing = [...new Set(expected.map((endpoint) => endpoint.resourceCode))]
        .filter((resourceCode) => !granted.has(resourceCode))
        .sort();
      if (missing.length === 0) continue;
      failures.push(
        `${relativePath}: ${groupCode} must grant ${
          vendorScoped
            ? `every seeded "${vendorCode}" api_endpoint`
            : `every seeded "${vendorCode}" api_endpoint with modalityCode "${scope}"`
        } but omits ${missing.length} of them; an account in this group cannot reach them and routing answers 50201`,
      );
      for (const resourceCode of missing) failures.push(`    ${resourceCode}`);
    }
  }
  notes.push(
    `resource groups: ${checkedGroups} vendor/modality-scoped group(s) compared against the seeds, ${skippedGroups} not vendor- or modality-scoped`,
  );
}

// ---------------------------------------------------------------------------
// 9. The closure guard's embedded declared-endpoint table has to match the
//    seeds.
// ---------------------------------------------------------------------------
//
// The five per-capability Rust guards each enumerate the vendors they know
// about by hand, which is how the same "one generic endpoint per capability"
// defect survived five times. Their replacement is a *closure* guard
// (`every_capability_binds_only_to_a_declared_vendor_native_endpoint`, in both
// copies of `model_catalog_import.rs`): it sweeps every
// `(vendor, apiFormat, capability)` combination the catalog can carry and
// asserts no descriptor invents a route outside the declared set.
//
// That guard needs the declared set spelled out inside the test, because the
// module has no filesystem access at test time. An embedded copy is a second
// source of truth, and a second source of truth that nothing compares is worse
// than no guard at all — a resource added to the seeds would make the test
// wrongly strict, and a hand-written line with no resource behind it would make
// it wrongly lenient. This check is that comparison.
//
// It also asserts the *inverse*: every declared native endpoint is either
// bindable by some capability descriptor or explicitly declared as a poll /
// utility surface. A declared endpoint no model can bind to is a route the
// project ships and no feature can use — how `minimax.music_generation` sat
// declared-but-unbound while all 15 active music models collapsed onto the
// Suno-protocol face.

const CLOSURE_GUARD_SOURCES = [
  "services/sdkwork-cloudrouter-router-service/src/infrastructure/sql/model_catalog_import.rs",
  "../sdkwork-models/crates/sdkwork-models-catalog-repository-sqlx/src/model_catalog_import.rs",
];

/** The `(endpoint_code, path_template)` pairs the closure guard embeds. */
function embeddedDeclaredEndpoints(source, relativePath) {
  const table = source.match(
    /DECLARED_VENDOR_NATIVE_ENDPOINTS\s*:\s*&\[\(&str,\s*&str\)\]\s*=\s*&\[([\s\S]*?)\n {8}\];/,
  );
  if (!table) return null;
  // rustfmt wraps long tuples across lines (`(\n  "code",\n  "path",\n),`), so
  // the scan has to tolerate arbitrary whitespace between the two literals —
  // requiring them on one line silently dropped the five longest entries and
  // made this check report a false gap.
  const entries = [];
  for (const match of table[1].matchAll(
    /\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,?\s*\)/g,
  )) {
    entries.push([match[1], match[2]]);
  }
  return entries;
}

// The table mirrors exactly one seed file — the vendor-native declarations —
// not every seed, so the comparison is scoped to that file. The generic
// `openai.*` compatibility faces live in other seed files and are deliberately
// outside the table: they are what a descriptor returns when it *declines* to
// go native, so they must not be in the "declared native" set.
const VENDOR_NATIVE_SEED = "data/ai-routing/resources/vendor-native-resources.json";
const vendorNativeSeedPath = join(root, VENDOR_NATIVE_SEED);
let nativeSeedEndpoints = [];
if (existsSync(vendorNativeSeedPath)) {
  try {
    const document = JSON.parse(readFileSync(vendorNativeSeedPath, "utf8"));
    nativeSeedEndpoints = (document.items ?? [])
      .filter((item) => item.resourceType === "api_endpoint" && item.pathTemplate)
      .map((item) => [item.apiCode, item.pathTemplate])
      .sort(([leftCode, leftPath], [rightCode, rightPath]) =>
        leftCode === rightCode
          ? leftPath.localeCompare(rightPath)
          : leftCode.localeCompare(rightCode),
      );
  } catch (error) {
    failures.push(`${VENDOR_NATIVE_SEED}: invalid JSON (${error.message})`);
  }
}

for (const relativePath of CLOSURE_GUARD_SOURCES) {
  if (!existsSync(join(root, relativePath))) continue;
  const source = read(relativePath);
  if (!source.includes("every_capability_binds_only_to_a_declared_vendor_native_endpoint")) {
    continue;
  }
  const embedded = embeddedDeclaredEndpoints(source, relativePath);
  if (!embedded) {
    failures.push(
      `${relativePath}: carries the closure guard but its DECLARED_VENDOR_NATIVE_ENDPOINTS table cannot be read; the guard's declared set would go unchecked`,
    );
    continue;
  }
  const embeddedSorted = [...embedded].sort(([leftCode, leftPath], [rightCode, rightPath]) =>
    leftCode === rightCode ? leftPath.localeCompare(rightPath) : leftCode.localeCompare(rightCode),
  );
  const missingFromGuard = nativeSeedEndpoints.filter(
    ([code, path]) => !embeddedSorted.some(([c, p]) => c === code && p === path),
  );
  const notSeeded = embeddedSorted.filter(
    ([code, path]) => !nativeSeedEndpoints.some(([c, p]) => c === code && p === path),
  );
  notes.push(
    `${relativePath.split("/").pop()} closure guard: ${embeddedSorted.length} embedded endpoint(s) vs ${nativeSeedEndpoints.length} declared in ${VENDOR_NATIVE_SEED}`,
  );
  if (missingFromGuard.length > 0) {
    failures.push(
      `${relativePath}: the seeds declare ${missingFromGuard.length} vendor-native endpoint(s) the closure guard's table omits; the guard would reject a legitimate native binding`,
    );
    for (const [code, path] of missingFromGuard) failures.push(`    ${code} ${path}`);
  }
  if (notSeeded.length > 0) {
    failures.push(
      `${relativePath}: the closure guard's table declares ${notSeeded.length} endpoint(s) no seed backs; the guard would accept an invented route`,
    );
    for (const [code, path] of notSeeded) failures.push(`    ${code} ${path}`);
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

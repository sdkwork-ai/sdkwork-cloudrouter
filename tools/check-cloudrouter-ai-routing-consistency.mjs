#!/usr/bin/env node
/**
 * Consistency gate for the vendor-native AI routing chain.
 *
 * Three separate declarations have to agree before a vendor-native request can
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
 * Usage:
 *   node tools/check-cloudrouter-ai-routing-consistency.mjs [--root <dir>]
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const CLASSIFIER = "services/sdkwork-cloudrouter-router-service/src/application/invocation/provider_native_classifier.rs";
const PASSTHROUGH = "crates/sdkwork-cloudrouter-edge-runtime/src/passthrough.rs";
const TAXONOMY = "services/sdkwork-cloudrouter-router-service/src/application/ai_route_taxonomy.rs";
const SEED_DIR = "data/ai-routing/resources";
const OPEN_API_CONTRACT = "apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json";
const STANDALONE_MAIN = "crates/sdkwork-api-cloudrouter-standalone-gateway/src/main.rs";
const BOOTSTRAP = "crates/sdkwork-api-cloudrouter-assembly/src/bootstrap.rs";

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

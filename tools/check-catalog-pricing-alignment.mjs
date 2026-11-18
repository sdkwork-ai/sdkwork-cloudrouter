#!/usr/bin/env node
/**
 * Cross-repository pricing alignment gate.
 *
 * The billable surface spans two repositories:
 *
 *   sdkwork-models   meters.json (meter registry), models/<vendor>/global/models,
 *                    models/<vendor>/global/pricing, and the `BillingMeter`
 *                    enum in `sdkwork-models-catalog-service`
 *   sdkwork-cloudrouter  `pricing_dimensions` in the invocation pricing stage —
 *                    the only place that turns a request into the dimension
 *                    values a price row can be conditioned on.
 *
 * Every one of those joins fails silently on its own:
 *
 *   - a price row naming a meter the registry does not know can never settle;
 *   - a price row conditioned on a dimension the gateway never injects can never
 *     match, so the model looks priced and still refuses at preflight;
 *   - a sellable model without a price row is advertised and then unbuyable;
 *   - a meter present in Rust but absent from meters.json (or the reverse)
 *     makes the admin surfaces and the runtime disagree about the same unit.
 *
 * Usage:
 *   node tools/check-catalog-pricing-alignment.mjs [--root .] [--catalog <dir>] [--json]
 *
 * Exit code 1 when a hard invariant breaks. The catalog being absent (a CI
 * checkout without the sibling repository) is reported and skipped, because this
 * gate is a cross-repository join rather than a single-repository contract.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const root = path.resolve(repoRoot, option("--root", "."));
const catalogRoot = path.resolve(
  root,
  option("--catalog", path.join(root, "..", "sdkwork-models", "models")),
);
const asJson = args.includes("--json");

const catalogEnumsPath = path.resolve(
  catalogRoot,
  "..",
  "crates",
  "sdkwork-models-catalog-service",
  "src",
  "domain",
  "catalog_enums.rs",
);
const pricingDimensionsPath = path.join(
  root,
  "services",
  "sdkwork-cloudrouter-router-service",
  "src",
  "application",
  "invocation",
  "pricing.rs",
);

/** `shelfState` values that mean the model is offered to customers. */
const SELLABLE_SHELF_STATES = new Set(["listed", "public"]);
/** `routingState` values that mean traffic may be routed to the model. */
const ROUTABLE_ROUTING_STATES = new Set(["routable", "active"]);

const failures = [];
const warnings = [];
const summary = {
  meters: 0,
  enumCodes: 0,
  priceRows: 0,
  priceFiles: 0,
  models: 0,
  sellableModels: 0,
  injectedDimensions: 0,
  catalogDimensions: 0,
};

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

if (!existsSync(catalogRoot) || !existsSync(catalogEnumsPath) || !existsSync(pricingDimensionsPath)) {
  const missing = [catalogRoot, catalogEnumsPath, pricingDimensionsPath].filter(
    (candidate) => !existsSync(candidate),
  );
  console.log(
    `catalog-pricing-alignment: skipped (cross-repository inputs missing: ${missing.join(", ")})`,
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// 1. Meter registry <-> Rust meter enum
// ---------------------------------------------------------------------------
const registryCodes = new Set(
  readJson(path.join(catalogRoot, "meters.json")).meters.map((meter) => meter.meterCode),
);
summary.meters = registryCodes.size;

const enumSource = readFileSync(catalogEnumsPath, "utf8");
// Scope the scan to `impl BillingMeter { ... code() }`: the same file also
// returns vendor codes from unrelated enums (`IntegrationProviderType::code`),
// which would otherwise be mistaken for meters.
const enumImplStart = enumSource.indexOf("impl BillingMeter {");
const enumCodeStart =
  enumImplStart >= 0 ? enumSource.indexOf("pub fn code(&self)", enumImplStart) : -1;
const enumCodeEnd =
  enumCodeStart >= 0 ? enumSource.indexOf("pub fn from_code", enumCodeStart) : -1;
if (enumCodeStart < 0 || enumCodeEnd <= enumCodeStart) {
  fail("could not locate BillingMeter::code(); the parser is stale, fix it before trusting this gate");
}
const enumCodeBlock = enumSource.slice(enumCodeStart, enumCodeEnd > 0 ? enumCodeEnd : undefined);
const enumCodes = new Set(
  [...enumCodeBlock.matchAll(/Self::\w+\s*=>\s*"([a-z0-9_]+)"/g)].map((match) => match[1]),
);
summary.enumCodes = enumCodes.size;

for (const code of enumCodes) {
  if (!registryCodes.has(code)) {
    fail(`meter \`${code}\` exists in the Rust BillingMeter enum but not in meters.json`);
  }
}
for (const code of registryCodes) {
  if (!enumCodes.has(code)) {
    fail(`meter \`${code}\` exists in meters.json but not in the Rust BillingMeter enum`);
  }
}

// ---------------------------------------------------------------------------
// 2. Dimensions the gateway can inject
// ---------------------------------------------------------------------------
const pricingSource = readFileSync(pricingDimensionsPath, "utf8");
// Scope to the `pricing_dimensions` function body: tests in the same file also
// build dimension lists, and they are not the runtime contract.
const dimensionsFnStart = pricingSource.indexOf("fn pricing_dimensions(");
const dimensionsFnEnd =
  dimensionsFnStart >= 0 ? pricingSource.indexOf("\nfn ", dimensionsFnStart + 1) : -1;
const dimensionsBody = pricingSource.slice(
  dimensionsFnStart,
  dimensionsFnEnd > 0 ? dimensionsFnEnd : undefined,
);
const injectedDimensions = new Set(
  [...dimensionsBody.matchAll(/\("([a-z_]+)",\s*&\[/g)].map((match) => match[1]),
);
summary.injectedDimensions = injectedDimensions.size;
if (injectedDimensions.size === 0) {
  fail(
    "could not read any injected pricing dimension from pricing_dimensions; the parser is stale, fix it before trusting this gate",
  );
}

// ---------------------------------------------------------------------------
// 3. Price rows: known meter, injectable condition dimension
// ---------------------------------------------------------------------------
const catalogDimensions = new Map();
const vendors = readdirSync(catalogRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const pricedModelKeys = new Set();
for (const vendor of vendors) {
  const regionRoot = path.join(catalogRoot, vendor, "global");
  const modelsDir = path.join(regionRoot, "models");
  const pricingDir = path.join(regionRoot, "pricing");
  if (existsSync(modelsDir)) {
    summary.models += readdirSync(modelsDir).filter((file) => file.endsWith(".json")).length;
  }
  if (!existsSync(pricingDir)) {
    continue;
  }
  for (const file of readdirSync(pricingDir).filter((entry) => entry.endsWith(".json"))) {
    summary.priceFiles += 1;
    pricedModelKeys.add(`${vendor}/${path.basename(file, ".json")}`);
    let document;
    try {
      document = readJson(path.join(pricingDir, file));
    } catch (error) {
      fail(`pricing file ${vendor}/global/pricing/${file} is not valid JSON: ${error.message}`);
      continue;
    }
    for (const price of document.prices ?? []) {
      summary.priceRows += 1;
      const id = `${vendor}/global/pricing/${file}#${price.priceId ?? "(no priceId)"}`;
      if (!registryCodes.has(price.meterCode)) {
        fail(`${id} prices unknown meter \`${price.meterCode}\``);
      }
      if (!price.unitPrice) {
        fail(`${id} has no unitPrice`);
      }
      for (const condition of price.conditions ?? []) {
        const dimension = condition.dimensionCode;
        if (!dimension) {
          fail(`${id} has a condition without dimensionCode`);
          continue;
        }
        catalogDimensions.set(dimension, (catalogDimensions.get(dimension) ?? 0) + 1);
        if (!injectedDimensions.has(dimension)) {
          fail(
            `${id} is conditioned on dimension \`${dimension}\`, which pricing_dimensions never injects; the row can never match`,
          );
        }
      }
    }
  }
}
summary.catalogDimensions = catalogDimensions.size;

// ---------------------------------------------------------------------------
// 4. Sellable models must be priced
// ---------------------------------------------------------------------------
const unpriceSellable = [];
for (const vendor of vendors) {
  const modelsDir = path.join(catalogRoot, vendor, "global", "models");
  if (!existsSync(modelsDir)) {
    continue;
  }
  for (const file of readdirSync(modelsDir).filter((entry) => entry.endsWith(".json"))) {
    const modelId = path.basename(file, ".json");
    let model;
    try {
      model = readJson(path.join(modelsDir, file));
    } catch {
      continue;
    }
    const sellable =
      SELLABLE_SHELF_STATES.has(String(model.shelfState ?? "").toLowerCase()) ||
      ROUTABLE_ROUTING_STATES.has(String(model.routingState ?? "").toLowerCase());
    if (!sellable) {
      continue;
    }
    summary.sellableModels += 1;
    if (!pricedModelKeys.has(`${vendor}/${modelId}`)) {
      unpriceSellable.push(`${vendor}/${modelId}`);
    }
  }
}
for (const model of unpriceSellable) {
  fail(`${model} is sellable but has no pricing file; a routed request would refuse at preflight`);
}

// ---------------------------------------------------------------------------
// 5. Official-basis dimensions the catalog cannot express yet
// ---------------------------------------------------------------------------
const OFFICIAL_BASIS_DIMENSIONS = [
  [
    "service_tier",
    "OpenAI/Anthropic batch inference is 50% of the standard rate; without a batch dimension the reconciled batch usage prices at 100%.",
  ],
  [
    "cache_storage_token_hour",
    "Gemini cachedContents storage is billed per token-hour; llm_cache_storage_token_hour exists but no rate can carry a time dimension.",
  ],
];
for (const [dimension, reason] of OFFICIAL_BASIS_DIMENSIONS) {
  if (!injectedDimensions.has(dimension)) {
    warn(`official basis dimension \`${dimension}\` is not billable: ${reason}`);
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
if (asJson) {
  console.log(
    JSON.stringify(
      {
        summary,
        catalogDimensions: Object.fromEntries([...catalogDimensions].sort()),
        injectedDimensions: [...injectedDimensions].sort(),
        failures,
        warnings,
      },
      null,
      2,
    ),
  );
} else {
  console.log(
    `catalog-pricing-alignment: meters=${summary.meters} enum=${summary.enumCodes} priceFiles=${summary.priceFiles} priceRows=${summary.priceRows} models=${summary.models} sellable=${summary.sellableModels}`,
  );
  console.log(
    `  injected dimensions (${summary.injectedDimensions}): ${[...injectedDimensions].sort().join(", ")}`,
  );
  console.log(
    `  catalog conditions (${summary.catalogDimensions}): ${[...catalogDimensions.keys()].sort().join(", ") || "none"}`,
  );
  for (const message of warnings) {
    console.log(`  warn  ${message}`);
  }
  for (const message of failures) {
    console.log(`  FAIL  ${message}`);
  }
}

if (failures.length > 0) {
  console.error(`catalog-pricing-alignment: FAILED (${failures.length} invariant violation(s))`);
  process.exit(1);
}
console.log("catalog-pricing-alignment: passed");

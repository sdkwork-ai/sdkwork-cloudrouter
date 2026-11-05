#!/usr/bin/env node
/**
 * Vendor door coverage audit.
 *
 * The catalog is the authority for which vendor speaks which protocol: a model
 * that declares `apiFormat = "vendor_native"` is promised a vendor-native route,
 * and the contract is the authority for which such routes are actually
 * published. This audit joins the two and reports every
 * `(vendor, capability)` pair that the catalog commits to but the contract does
 * not publish a door for.
 *
 * It exists because that gap is silent: `mureka` shipped eight music models and
 * the project carried `mureka.music_generation` with a seed and a classifier arm,
 * yet no contract door — the models were unreachable, and every existing gate
 * passed because the door check only looks at published operations.
 *
 * Usage:
 *   node tools/audit-vendor-door-coverage.mjs [--root .] [--catalog <dir>] [--json]
 *
 * Exit code 1 when a `vendor_native` pair has no published door and no entry in
 * the ledger below.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const root = path.resolve(repoRoot, option("--root", "."));
const catalogRoot = option("--catalog", path.join(root, "..", "sdkwork-models", "models"));
const asJson = args.includes("--json");

/**
 * Pairs that are intentionally served by the OpenAI-compatible face instead of a
 * vendor-native door. Every entry states why, so a new `vendor_native` model
 * cannot quietly join the list.
 */
const COMPAT_FACE_PAIRS = new Map([
  [
    "xiaomi/video",
    "Xiaomi MiMo video is published as /v1/videos (openai_compatible); the catalog declares vendor_native only for its image, speech and chat routes.",
  ],
  [
    "baidu/chat",
    "Baidu Qianfan v2 chat is a vendor_native route bound by the model descriptor, but the contract publishes the chat capability through /v1/chat/completions only; no /baidu door.",
  ],
  [
    "bytedance/music",
    "Seed-Music GenSong V4 is served through Volcengine's Action-style RPC (open.volcengineapi.com?Action=GenSongV4), not a REST path the router's vendor-relay planner can name; the vendor.json apiEndpoints record only the Ark /api/v3 OpenAI-compatible host, which carries no music surface. No vendor-native REST door exists to publish — the pair is ledgered rather than wired to a path the vendor does not serve.",
  ],
]);

/**
 * Catalog vendor code -> contract namespace, when they differ. The catalog
 * keeps Kling's company name (`kuaishou`) while the published doors use the
 * product namespace (`kling`).
 */
const VENDOR_NAMESPACE_ALIASES = new Map([["kuaishou", "kling"]]);

/**
 * Pairs served by a door in another capability family because the vendor
 * publishes one endpoint for both. `stability_ai` answers sound effects and
 * music from the same `POST /v2beta/audio/stable-audio-2/text-to-audio` call
 * (`model` selects the variant), which is published under the Audio family.
 */
const SHARED_ENDPOINT_PAIRS = new Map([
  [
    "stability_ai/music",
    "Stable Audio serves music and sound effects from one endpoint, published as Audio/stability_ai.",
  ],
]);

/**
 * Capability -> the documentation family whose doors satisfy it. `sfx` is an
 * audio capability with no separate family, so any published Audio door for the
 * vendor counts — this audit answers "does the vendor have a door for this
 * kind of capability", not "is every endpoint published".
 */
const CAPABILITY_TAG = {
  image: "Images",
  video: "Videos",
  audio: "Audio",
  music: "Music",
  sfx: "Audio",
  speech: "Audio",
};

const readJson = (file) => JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, ""));

/** Collect `vendor -> primary capability -> model ids` for vendor_native models. */
function collectCatalogPairs(catalogDir) {
  const pairs = new Map();
  let vendors = [];
  try {
    vendors = readdirSync(catalogDir).filter((name) => {
      try {
        return statSync(path.join(catalogDir, name)).isDirectory();
      } catch {
        return false;
      }
    });
  } catch {
    return { pairs, missing: true };
  }
  for (const vendor of vendors) {
    let regions = [];
    try {
      regions = readdirSync(path.join(catalogDir, vendor));
    } catch {
      continue;
    }
    for (const region of regions) {
      const modelsDir = path.join(catalogDir, vendor, region, "models");
      let files = [];
      try {
        files = readdirSync(modelsDir).filter((f) => f.endsWith(".json"));
      } catch {
        continue;
      }
      for (const file of files) {
        const model = readJson(path.join(modelsDir, file));
        if ((model.apiFormat ?? "").trim() !== "vendor_native") continue;
        // Only the primary capability decides which family of doors the model
        // needs. Secondary capabilities describe what the artifact *contains*
        // (a video that carries an audio track is not an audio-generation
        // model), so they would only produce false gaps.
        const capability = String(model.primaryCapability ?? "").trim();
        if (!CAPABILITY_TAG[capability]) continue;
        const vendorCode = String(model.vendorCode ?? vendor).trim();
        const key = `${vendorCode}/${capability}`;
        if (!pairs.has(key)) pairs.set(key, { vendorCode, capability, models: [] });
        pairs.get(key).models.push(model.modelId);
      }
    }
  }
  return { pairs, missing: false };
}

/** Collect `namespace -> documentation families` from published contract operations. */
function collectPublishedDoors(contractPath) {
  const spec = readJson(contractPath);
  const published = new Map();
  for (const [routePath, pathItem] of Object.entries(spec.paths ?? {})) {
    const segments = routePath.split("/").filter(Boolean);
    if (segments.length < 2) continue;
    const namespace = segments[0];
    for (const operation of Object.values(pathItem)) {
      if (!operation || typeof operation !== "object") continue;
      const family = (operation.tags ?? [""])[0].split("/")[0];
      if (!Object.values(CAPABILITY_TAG).includes(family)) continue;
      if (!published.has(namespace)) published.set(namespace, new Set());
      published.get(namespace).add(family);
    }
  }
  return published;
}

const catalog = collectCatalogPairs(catalogRoot);
const contract = path.join(root, "apis", "open-api", "cloudrouter", "cloudrouter-open-api.openapi.json");
const published = collectPublishedDoors(contract);

const gaps = [];
const covered = [];
for (const [key, pair] of catalog.pairs) {
  if (COMPAT_FACE_PAIRS.has(key)) {
    covered.push({ ...pair, door: "compat-face", reason: COMPAT_FACE_PAIRS.get(key) });
    continue;
  }
  if (SHARED_ENDPOINT_PAIRS.has(key)) {
    covered.push({ ...pair, door: "shared-endpoint", reason: SHARED_ENDPOINT_PAIRS.get(key) });
    continue;
  }
  const namespace = VENDOR_NAMESPACE_ALIASES.get(pair.vendorCode) ?? pair.vendorCode;
  const family = CAPABILITY_TAG[pair.capability];
  if (published.get(namespace)?.has(family)) {
    covered.push({ ...pair, door: "published" });
    continue;
  }
  gaps.push(pair);
}

const report = {
  catalog: catalog.missing ? "missing" : catalogRoot,
  pairs: catalog.pairs.size,
  covered: covered.length,
  gaps: gaps.length,
  missingDoors: gaps.map((gap) => ({
    pair: `${gap.vendorCode}/${gap.capability}`,
    models: gap.models.length,
    sample: gap.models.slice(0, 4),
  })),
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`vendor-door-coverage: catalog=${report.catalog} pairs=${report.pairs} covered=${report.covered} gaps=${report.gaps}`);
  for (const gap of report.missingDoors) {
    console.log(`  MISSING ${gap.pair.padEnd(28)} models=${String(gap.models).padStart(2)}  e.g. ${gap.sample.join(", ")}`);
  }
}

if (catalog.missing) {
  console.error(`vendor-door-coverage: catalog not found at ${catalogRoot} (pass --catalog)`);
  process.exit(2);
}
process.exit(report.gaps === 0 ? 0 : 1);

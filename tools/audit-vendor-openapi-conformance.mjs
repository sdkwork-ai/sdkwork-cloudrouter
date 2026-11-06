#!/usr/bin/env node
/**
 * Vendor OpenAPI conformance audit — compares the published open-api doors
 * against each vendor's own machine-readable specification.
 *
 * Why this exists
 * ---------------
 * A vendor-native door is a promise that the published path, the request
 * envelope, and the response shape are the vendor's own. The routing gates
 * (`check-cloudrouter-ai-routing-consistency.mjs`) prove a door is *reachable*;
 * they cannot tell whether it is *truthful*. Three defects found this way were
 * invisible to every other gate:
 *
 *   - xAI `videos/extensions` published a `user` field the vendor does not
 *     accept in that request (ExtendVideoRequest has no `user`).
 *   - xAI video was declared `openai_compatible` even though its submit path is
 *     `/v1/videos/generations`, not OpenAI's `/v1/videos`.
 *   - Black Forest Labs serves one path per model (`/v1/flux-2-pro`); a `{model}`
 *     documented as the full id would have produced `/v1/flux-flux-2-pro`.
 *
 * Inputs are cached vendor specs — this tool never performs network I/O, so it
 * is safe to run in a loop. Refresh the cache with the vendor's own spec URL:
 *
 *   mkdir -p .tmp-vendor-specs
 *   curl -s https://docs.x.ai/openapi.json                            > .tmp-vendor-specs/xai.json
 *   curl -s https://docs.dev.runwayml.com/openapi.json                > .tmp-vendor-specs/runway.json
 *   curl -s https://api.elevenlabs.io/openapi.json                    > .tmp-vendor-specs/elevenlabs.json
 *   curl -s https://api.bfl.ai/openapi.json                           > .tmp-vendor-specs/bfl.json
 *   curl -s 'https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta' \
 *                                                                      > .tmp-vendor-specs/google.json
 *
 * Usage:
 *   node tools/audit-vendor-openapi-conformance.mjs [--spec-dir <dir>] [--json]
 *
 * Exit code 1 means an operation is published by the contract but neither
 * matches the vendor's spec nor appears in WIRE_EQUIVALENT with a reason.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

const argv = process.argv.slice(2);
const flagValue = (name, fallback) => {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const AS_JSON = argv.includes("--json");
const specDir = path.resolve(repoRoot, flagValue("--spec-dir", ".tmp-vendor-specs"));

const CONTRACT = "apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json";

/// Published namespace -> the cached spec that describes it, plus the prefix the
/// vendor spec does not carry.
const VENDOR_SPECS = {
  google: { spec: "google", strip: "/google" },
  elevenlabs: { spec: "elevenlabs", strip: "/elevenlabs" },
  black_forest_labs: { spec: "bfl", strip: "/black_forest_labs" },
  xai: { spec: "xai", strip: "/xai" },
  runway: { spec: "runway", strip: "/runway" },
};

/// Published paths whose wire form matches the vendor even though the vendor's
/// spec spells the template differently, publishes the model inside the path
/// instead of as a template, or does not list the action at all. Every entry
/// must carry a reason; an unexplained mismatch fails the audit.
const WIRE_EQUIVALENT = new Map([
  ["black_forest_labs POST /black_forest_labs/v1/flux-{model}", "vendor serves per-model paths /v1/flux-<suffix>; {model} is the suffix"],
  ["google POST /google/v1beta/models/{model}:generateContent", "official template v1beta/{+model}:generateContent; +model carries models/<id>"],
  ["google POST /google/v1beta/models/{model}:streamGenerateContent", "official template v1beta/{+model}:streamGenerateContent"],
  ["google POST /google/v1beta/models/{model}:countTokens", "official template v1beta/{+model}:countTokens"],
  ["google POST /google/v1beta/models/{model}:embedContent", "official template v1beta/{+model}:embedContent"],
  ["google POST /google/v1beta/models/{model}:batchEmbedContents", "not in the discovery document (ai.google.dev only); wire path follows the :batchEmbedContents action"],
  ["google POST /google/v1beta/models/{model}:generateImages", "not in the discovery document (ai.google.dev only); wire path follows the :generateImages action"],
  ["google POST /google/v1beta/models/{model}:generateVideos", "not in the discovery document (ai.google.dev only); wire path follows the :generateVideos action"],
  ["google GET /google/v1beta/models/{model}/operations/{operation_id}", "Veo poll uses the operation name models/<model>/operations/<id>; equivalent to v1beta/{+name}"],
  ["google GET /google/v1beta/files/{file_id}", "official file get uses v1beta/{+name} with name=files/<id>"],
  ["google DELETE /google/v1beta/files/{file_id}", "official file delete uses v1beta/{+name} with name=files/<id>"],
  ["google GET /google/v1beta/cachedContents/{cached_content_id}", "official cachedContent get uses v1beta/{+name} with name=cachedContents/<id>"],
  ["google DELETE /google/v1beta/cachedContents/{cached_content_id}", "official cachedContent delete uses v1beta/{+name} with name=cachedContents/<id>"],
]);

const collapse = (routePath) =>
  routePath.replace(/\{[^}]*\}/g, "{}").replace(/\/+$/, "");

function loadSpecs() {
  const specs = {};
  let entries = [];
  try {
    entries = readdirSync(specDir);
  } catch {
    return specs;
  }
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    const file = path.join(specDir, entry);
    if (!statSync(file).isFile()) continue;
    specs[entry.replace(/\.json$/, "")] = JSON.parse(
      readFileSync(file, "utf8").replace(/^\uFEFF/, ""),
    );
  }
  return specs;
}

/// Flattens an OpenAPI `paths` map or a Google Discovery `resources` tree into
/// `METHOD /path` -> operation.
function officialOperations(spec) {
  const operations = new Map();
  const add = (method, routePath, operation) => {
    if (!method || !routePath) return;
    const normalized = routePath.startsWith("/") ? routePath : `/${routePath}`;
    const key = `${String(method).toUpperCase()} ${normalized}`;
    if (!operations.has(key)) operations.set(key, operation);
  };
  for (const [routePath, item] of Object.entries(spec.paths ?? {})) {
    for (const [method, operation] of Object.entries(item ?? {})) {
      if (operation && typeof operation === "object" && !method.startsWith("x-")) {
        add(method, routePath, operation);
      }
    }
  }
  const walk = (resource) => {
    for (const method of Object.values(resource?.methods ?? {})) {
      add(method.httpMethod, method.path ?? method.flatPath, method);
    }
    for (const child of Object.values(resource?.resources ?? {})) walk(child);
  };
  walk(spec);
  return operations;
}

function resolveRef(spec, schema) {
  let current = schema;
  for (let depth = 0; depth < 4 && current?.$ref; depth += 1) {
    const name = current.$ref.split("/").pop();
    current = spec.components?.schemas?.[name];
  }
  return current;
}

function requestFieldSets(spec, operation) {
  let schema = resolveRef(spec, operation.requestBody?.content?.["application/json"]?.schema);
  if (!schema && operation.request?.$ref) schema = resolveRef(spec, operation.request);
  if (!schema) return null;
  return {
    names: new Set(Object.keys(schema.properties ?? {})),
    required: new Set(schema.required ?? []),
  };
}

function main() {
  const contract = JSON.parse(readFileSync(path.join(repoRoot, CONTRACT), "utf8"));
  const specs = loadSpecs();
  const rows = [];
  const missingSpecs = new Set();

  for (const [routePath, item] of Object.entries(contract.paths)) {
    const [namespace] = routePath.split("/").filter(Boolean);
    const binding = VENDOR_SPECS[namespace];
    if (!binding) continue;
    const spec = specs[binding.spec];
    if (!spec) {
      missingSpecs.add(binding.spec);
      continue;
    }
    const operations = officialOperations(spec);
    const localPath = routePath.startsWith(binding.strip)
      ? routePath.slice(binding.strip.length)
      : routePath;

    for (const [method, operation] of Object.entries(item)) {
      if (!operation?.operationId) continue;
      const wanted = `${method.toUpperCase()} ${localPath}`;
      const official =
        operations.get(wanted) ??
        [...operations.entries()].find(
          ([key]) => collapse(key.split(" ")[1] ?? "") === collapse(localPath),
        )?.[1];

      if (!official) {
        const reason = WIRE_EQUIVALENT.get(
          `${namespace} ${method.toUpperCase()} ${routePath}`,
        );
        rows.push({
          vendor: namespace,
          method: method.toUpperCase(),
          path: routePath,
          verdict: reason ? "WIRE_EQUIVALENT" : "PATH_NOT_IN_OFFICIAL_SPEC",
          detail: reason ?? "",
        });
        continue;
      }

      const ours = requestFieldSets(contract, operation);
      const theirs = requestFieldSets(spec, official);
      const notes = [];
      if (ours && theirs) {
        const missingRequired = [...theirs.required].filter((field) => !ours.names.has(field));
        const invented = [...ours.names].filter(
          (field) => !theirs.names.has(field) && theirs.names.size > 0,
        );
        if (missingRequired.length) notes.push(`missing official required: ${missingRequired.join(",")}`);
        if (invented.length) notes.push(`not in official: ${invented.join(",")}`);
      }
      rows.push({
        vendor: namespace,
        method: method.toUpperCase(),
        path: routePath,
        verdict: notes.length ? "FIELD_DRIFT" : "OK",
        detail: notes.join(" | "),
      });
    }
  }

  for (const missing of missingSpecs) {
    rows.push({
      vendor: missing,
      method: "-",
      path: "-",
      verdict: "SPEC_NOT_CACHED",
      detail: `no cached spec for ${missing}; refresh ${path.join(specDir, `${missing}.json`)}`,
    });
  }

  const order = {
    PATH_NOT_IN_OFFICIAL_SPEC: 0,
    FIELD_DRIFT: 1,
    SPEC_NOT_CACHED: 2,
    WIRE_EQUIVALENT: 3,
    OK: 4,
  };
  rows.sort(
    (left, right) =>
      order[left.verdict] - order[right.verdict] ||
      left.vendor.localeCompare(right.vendor) ||
      left.path.localeCompare(right.path),
  );

  if (AS_JSON) {
    console.log(JSON.stringify({ specDir, rows }, null, 2));
  } else {
    for (const row of rows) {
      console.log(
        `${row.verdict.padEnd(26)} ${row.vendor.padEnd(20)} ${row.method.padEnd(5)} ${row.path}`,
      );
      if (row.detail) console.log(`    ${row.detail}`);
    }
    const counts = rows.reduce(
      (accumulator, row) => ({
        ...accumulator,
        [row.verdict]: (accumulator[row.verdict] ?? 0) + 1,
      }),
      {},
    );
    console.log(`\nvendor-openapi-conformance: ${JSON.stringify(counts)}`);
  }

  const failed = rows.filter(
    (row) =>
      row.verdict === "PATH_NOT_IN_OFFICIAL_SPEC" || row.verdict === "FIELD_DRIFT",
  );
  if (failed.length > 0) {
    console.error(
      `${failed.length} vendor-native operation(s) do not match the vendor spec and carry no documented equivalence`,
    );
    process.exitCode = 1;
  }
}

main();

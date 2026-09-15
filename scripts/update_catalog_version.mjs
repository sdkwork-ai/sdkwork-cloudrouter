import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// `sdkwork-models` is a sibling repository resolved through the checkout root,
// never by absolute location (DEPENDENCY_MANAGEMENT_SPEC.md section 1).
const file = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "sdkwork-models",
  "sdkwork-models.json",
);
const doc = JSON.parse(readFileSync(file, "utf8"));
doc.catalogVersion = "2026.08.30.1";
doc.generatedAt = "2026-08-30T00:00:00Z";
writeFileSync(file, JSON.stringify(doc, null, 2) + "\n", "utf8");
console.log("updated catalogVersion=" + doc.catalogVersion + " generatedAt=" + doc.generatedAt);
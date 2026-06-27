#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const modelsServicePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../data/sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-admin-catalog/src/modelService.ts",
);
const lines = readFileSync(modelsServicePath, "utf8").split("\n");

const removeRanges = [
  [235, 321],
  [380, 449],
  [627, 755],
  [1225, 1362],
  [1616, 1683],
  [1754, 1832],
  [1834, 1840],
];

const remove = new Set();
for (const [start, end] of removeRanges) {
  for (let line = start; line <= end; line += 1) {
    remove.add(line - 1);
  }
}

const kept = lines.filter((_, index) => !remove.has(index));
writeFileSync(modelsServicePath, kept.join("\n"), "utf8");
console.log(`removed ${remove.size} lines from modelService.ts`);

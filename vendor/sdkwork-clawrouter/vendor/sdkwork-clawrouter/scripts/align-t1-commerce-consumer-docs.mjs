#!/usr/bin/env node
/**
 * Updates T1 commerce domain README composition-consumer lines after sdkwork-commerce
 * workspace retirement from sdkwork-space root.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const vendorConsumerLine =
  "- Composition consumer: `../sdkwork-clawrouter/vendor/sdkwork-commerce` (archived transitional platform snapshot)";
const legacyPatterns = [
  /- Composition consumer: `\.\.\/sdkwork-commerce` \(T0 platform\)\n/u,
  /- Commerce platform \(`\.\.\/sdkwork-commerce`\) consumes .+\n/u,
];

const repoRoots = [
  "sdkwork-account",
  "sdkwork-catalog",
  "sdkwork-inventory",
  "sdkwork-invoice",
  "sdkwork-membership",
  "sdkwork-merchandise",
  "sdkwork-order",
  "sdkwork-payment",
  "sdkwork-promotion",
  "sdkwork-shop",
];

let updated = 0;

for (const repo of repoRoots) {
  for (const relativePath of ["README.md", "AGENTS.md"]) {
    const filePath = path.join(workspaceRoot, repo, relativePath);
    if (!existsSync(filePath)) {
      continue;
    }

    let source = readFileSync(filePath, "utf8");
    let changed = false;

    for (const pattern of legacyPatterns) {
      if (pattern.test(source)) {
        source = source.replace(pattern, `${vendorConsumerLine}\n`);
        changed = true;
      }
    }

    if (changed) {
      writeFileSync(filePath, source, "utf8");
      updated += 1;
      console.log(`updated ${path.relative(workspaceRoot, filePath)}`);
    }
  }
}

console.log(`Aligned T1 commerce consumer docs: ${updated} files.`);

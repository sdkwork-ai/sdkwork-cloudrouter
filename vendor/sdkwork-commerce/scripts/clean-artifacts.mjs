#!/usr/bin/env node
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targets = [
  "target",
  "apps/sdkwork-commerce-pc/dist",
];

for (const relativePath of targets) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  rmSync(absolutePath, { force: true, recursive: true });
}

process.stdout.write("[clean-artifacts] removed build artifacts\n");

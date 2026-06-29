#!/usr/bin/env node
/**
 * Rewrites legacy `(StatusCode::*, Json(PlusApiResult::error(...))).into_response()`
 * to `PlusApiResult::error(...).into_response()`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "services",
  "sdkwork-clawrouter-router-service",
  "src",
  "api",
);

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
      continue;
    }
    if (entry.isFile() && full.endsWith(".rs") && entry.name !== "response.rs") {
      files.push(full);
    }
  }
  return files;
}

const patterns = [
  {
    re: /\(\s*StatusCode::[A-Z_0-9]+,\s*Json\(PlusApiResult(?:::<[^>]+>)?::error\(([\s\S]*?)\)\s*,?\s*\)\s*\)\s*\.into_response\(\)/g,
    replace: "PlusApiResult::error($1).into_response()",
  },
  {
    re: /\(\s*StatusCode::[A-Z_0-9]+,\s*\r?\n\s*Json\(PlusApiResult(?:::<[^>]+>)?::error\(([\s\S]*?)\)\s*,?\r?\n\s*\)\s*\r?\n\s*\.into_response\(\)/g,
    replace: "PlusApiResult::error($1).into_response()",
  },
  {
    re: /Json\(PlusApiResult(?:::<[^>]+>)?::error\(([\s\S]*?)\)\)/g,
    replace: "PlusApiResult::error($1)",
  },
];

let changed = 0;
for (const filePath of walk(apiRoot)) {
  let source = fs.readFileSync(filePath, "utf8");
  let next = source;
  for (const { re, replace } of patterns) {
    next = next.replace(re, replace);
  }
  if (next !== source) {
    fs.writeFileSync(filePath, next, "utf8");
    changed += 1;
    console.log(`updated ${path.relative(apiRoot, filePath)}`);
  }
}

console.log(`[migrate-plus-api-result-call-sites] updated ${changed} files`);

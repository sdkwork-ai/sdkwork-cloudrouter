#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = fs.readFileSync(
  path.join(root, "crates/sdkwork-commerce-api-server/src/lib.rs"),
  "utf8",
);
const manifest = fs.readFileSync(
  path.join(root, "crates/sdkwork-commerce-api-server/src/manifest_stub_router.rs"),
  "utf8",
);
const prefixBlock = manifest.match(/MATERIALIZED_PREFIXES: &\[([\s\S]*?)\];/);
const prefixes = [...prefixBlock[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const routeRe =
  /CommerceHttpRoute::new\(\s*HttpMethod::\w+,\s*"([^"]+)",\s*"[^"]+",\s*"([^"]+)"/g;
const app = [];
for (const match of lib.matchAll(routeRe)) {
  if (match[1].startsWith("/app/")) {
    app.push({ path: match[1], op: match[2] });
  }
}
const stub = app.filter(
  (r) => !prefixes.some((p) => r.path === p || r.path.startsWith(`${p}/`)),
);
const groups = new Map();
for (const r of stub) {
  const g = r.path.split("/").slice(0, 5).join("/");
  if (!groups.has(g)) groups.set(g, []);
  groups.get(g).push(r);
}
console.log(`app routes: ${app.length}, still stubbed: ${stub.length}`);
for (const [g, rs] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${g} (${rs.length})`);
  for (const r of rs.slice(0, 5)) console.log(`  ${r.op}`);
  if (rs.length > 5) console.log(`  ... +${rs.length - 5} more`);
}

#!/usr/bin/env node
// Same-origin dependency integration regression gate for sdkwork-cloudrouter.
//
// Enforces two properties this repository has no machine check for today:
//
//   1. No port forwarding. The standalone/cloud dependency surfaces MUST be
//      integrated as in-process Rust composition (assembly entrypoints merged
//      into the gateway router). A reverse proxy that forwards to another HTTP
//      listener is forbidden: it hides ownership, breaks the single Web
//      Framework pipeline, and turns a composition defect into a runtime 404.
//
//   2. Declared surface => real integration entrypoint. Every `same-origin*`
//      entry in `dependencyApiSurfaces` must name an `embeddedExecutableExport`
//      that is actually reachable from the gateway's composition closure.
//
// Scope note (learned the hard way): a naive grep over only the assembly crate
// produces false positives -- cloudrouter mounts several dependency app
// surfaces *inline* through its own `sdkwork-routes-cloudrouter-app-api`
// (e.g. models catalog via `app_model_catalog_router`). This gate therefore
// scans the whole integration closure, not one crate.
//
// Usage: node scripts/check-same-origin-integration.mjs [--root <repo>]

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(process.argv.includes('--root')
  ? process.argv[process.argv.indexOf('--root') + 1]
  : join(HERE, '..'));

// Crates that participate in the dependency integration closure. Scanning only
// one of them is the exact mistake that produced false positives before.
const CLOSURE_ROOTS = [
  'crates/sdkwork-api-cloudrouter-assembly/src',
  'crates/sdkwork-api-cloudrouter-standalone-gateway/src',
  'crates/sdkwork-cloudrouter-edge-runtime/src',
  'crates/sdkwork-routes-cloudrouter-app-api/src',
  'crates/sdkwork-routes-cloudrouter-backend-api/src',
];

const GATEWAY_SPEC =
  'crates/sdkwork-api-cloudrouter-standalone-gateway/specs/component.spec.json';
const ASSEMBLY_SPEC =
  'crates/sdkwork-api-cloudrouter-assembly/specs/component.spec.json';

// Reverse-proxy shapes that mean "another HTTP listener answers this route".
// A raw `reqwest::Client` is NOT flagged on its own: provider adapters and
// internal SDK clients legitimately use it. Only self-forwarding is forbidden.
const PORT_FORWARD_PATTERNS = [
  { re: /\bproxy_pass\b/, why: 'nginx-style reverse proxy directive in Rust source' },
  { re: /\bProxyPass\b/, why: 'Apache-style reverse proxy directive in Rust source' },
  { re: /forward_to_listener\s*\(/, why: 'explicit forward to a separate HTTP listener' },
  { re: /reverse_proxy\s*\(/, why: 'reverse proxy helper' },
  {
    re: /reqwest::Client[\s\S]{0,400}?127\.0\.0\.1:\d{4,5}/,
    why: 'loopback HTTP forward to a sibling dev port (port-forwarding integration)',
  },
];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith('.rs')) out.push(p);
  }
  return out;
}

// Strip `#[cfg(test)] mod tests { ... }` so integration evidence must come from
// production code. Without this, a test that asserts on a source string (a
// common regression guard) satisfies the check even after the real call is
// deleted -- a mutation test caught exactly that false green.
function stripTestModules(text) {
  const marker = /#\[cfg\(test\)\]\s*mod\s+\w+\s*\{/;
  const match = marker.exec(text);
  return match ? text.slice(0, match.index) : text;
}

function loadClosureSources() {
  const files = CLOSURE_ROOTS.flatMap((rel) => walk(join(ROOT, rel)));
  return files.map((file) => ({
    file,
    text: readFileSync(file, 'utf8'),
    productionText: stripTestModules(readFileSync(file, 'utf8')),
  }));
}

function checkNoPortForwarding(sources) {
  const issues = [];
  for (const { file, productionText } of sources) {
    for (const { re, why } of PORT_FORWARD_PATTERNS) {
      const lines = productionText.split('\n');
      for (let i = 0; i < lines.length; i += 1) {
        if (re.test(lines[i])) {
          issues.push(
            `${file.split(/[\\/]/).slice(-3).join('/')}:${i + 1} ${why}`,
          );
        }
      }
    }
  }
  return issues;
}

function declaredSurfaces() {
  const out = [];
  for (const specPath of [GATEWAY_SPEC, ASSEMBLY_SPEC]) {
    const abs = join(ROOT, specPath);
    if (!existsSync(abs)) continue;
    const spec = JSON.parse(readFileSync(abs, 'utf8'));
    for (const surface of spec.contracts?.dependencyApiSurfaces ?? []) {
      if (!String(surface.runtimeMode ?? '').startsWith('same-origin')) continue;
      out.push({ specPath, ...surface });
    }
  }
  return out;
}

// A declared surface is integrated when its export (or the cloudrouter-owned
// inline mount that carries it) is reachable in the scanned closure.
//
// `app_api_route_manifest`-style exports are *manifest declarations*: they are
// satisfied by the manifest composition registry, not by a standalone router.
// The registry explicitly documents that its list is kept aligned with the
// inline mount in `routes.rs`, so a registry entry plus an inline mount is the
// real integration evidence for those surfaces.
// A declared surface is integrated when its export is reachable in production
// code. Two shapes are legitimate and they are checked differently:
//
//   * Router exports (`assemble_*`, `web_module*`) mount a live router, so they
//     REQUIRE a call site: `fn(`.
//   * Manifest exports (`*_route_manifest`) only register a route inventory;
//     the owning router is mounted inline by the app/backend route crate. Those
//     are satisfied by a function reference (with or without a call), because
//     `MountedAppCapability { manifest: ...::app_api_route_manifest }` IS the
//     integration for them.
function checkDeclaredSurfaces(sources, surfaces) {
  const blob = sources.map((s) => s.productionText).join('\n');
  const issues = [];
  for (const surface of surfaces) {
    const exportName = surface.embeddedExecutableExport;
    if (!exportName) {
      issues.push(`${surface.workspace}/${surface.surface}: missing embeddedExecutableExport`);
      continue;
    }
    const fn = exportName.split('::').pop();
    const isManifestExport = /_route_manifest$/.test(fn);
    const evidence = isManifestExport ? blob.includes(fn) : blob.includes(fn + '(');
    if (evidence) continue;
    const expectation = isManifestExport ? 'function reference' : 'call site';
    issues.push(
      `${surface.workspace}/${surface.surface}: declared export \`${exportName}\` has no ${expectation} in the gateway composition closure (production code only)`,
    );
  }
  return issues;
}

function main() {
  const sources = loadClosureSources();
  if (sources.length === 0) {
    console.error('same-origin integration check: no closure sources found under', ROOT);
    process.exit(2);
  }
  const surfaces = declaredSurfaces();
  const forwarding = checkNoPortForwarding(sources);
  const missing = checkDeclaredSurfaces(sources, surfaces);

  if (forwarding.length > 0 || missing.length > 0) {
    console.error('same-origin dependency integration check failed:');
    for (const line of forwarding) console.error(`- [port-forwarding] ${line}`);
    for (const line of missing) console.error(`- [missing-integration] ${line}`);
    process.exit(1);
  }
  console.log(
    `same-origin dependency integration check passed ` +
      `(${surfaces.length} declared same-origin surface(s), ` +
      `${sources.length} closure source file(s), 0 port-forwarding pattern(s))`,
  );
}

main();

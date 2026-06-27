#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later AND LicenseRef-SDKWork-Commercial-Restriction
// Generates SPDX-2.3 SBOM covering both Rust workspace and npm dependency trees,
// plus SHA-256 checksums for every built install package artifact.
// Aligns with sdkwork-specs/SUPPLY_CHAIN_SECURITY_SPEC.md §4 (SBOM coverage) and
// sdkwork-specs/RELEASE_SPEC.md (release attestation).

import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, basename, relative } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const outDir = join(root, 'deployments', 'artifacts');
mkdirSync(outDir, { recursive: true });

const createdAt = new Date().toISOString();
const generatorName = 'scripts/generate-release-sbom.mjs';
const generatorVersion = '1.1.0';

// ---------------------------------------------------------------------------
// 1. Rust workspace packages (with full dependency tree via cargo metadata)
// ---------------------------------------------------------------------------
let rustPackages = [];
let rustDependencies = [];
try {
  const rustMetadata = JSON.parse(
    execSync('cargo metadata --format-version=1', {
      cwd: root,
      encoding: 'utf8',
    }),
  );
  rustPackages = rustMetadata.packages.map((pkg) => ({
    name: pkg.name,
    version: pkg.version,
    license: pkg.license ?? null,
    source: pkg.source ?? null,
    packageType: 'cargo',
  }));
  // Build dependency edges (resolve.deps maps node ids → dep lists)
  const nodeIdToSpdxId = new Map();
  rustMetadata.packages.forEach((pkg, index) => {
    nodeIdToSpdxId.set(pkg.id, `SPDXRef-Cargo-${index + 1}`);
  });
  rustDependencies = [];
  for (const [sourceId, deps] of Object.entries(rustMetadata.resolve.nodes.reduce((acc, node) => {
    acc[node.id] = node.deps;
    return acc;
  }, {}))) {
    const sourceSpdx = nodeIdToSpdxId.get(sourceId);
    if (!sourceSpdx) continue;
    for (const dep of deps) {
      const targetSpdx = nodeIdToSpdxId.get(dep.pkg);
      if (!targetSpdx) continue;
      rustDependencies.push({
        spdxElementId: sourceSpdx,
        relationshipType: 'DEPENDS_ON',
        relatedSpdxElement: targetSpdx,
      });
    }
  }
} catch (error) {
  console.warn(`[sbom] cargo metadata failed; Rust tree omitted: ${error.message}`);
}

// ---------------------------------------------------------------------------
// 2. Root pnpm workspace npm packages (with full transitive tree)
// ---------------------------------------------------------------------------
let rootNpmPackages = [];
try {
  rootNpmPackages = collectPnpmPackages(root);
} catch (error) {
  console.warn(`[sbom] root pnpm packages omitted: ${error.message}`);
}

// ---------------------------------------------------------------------------
// 3. PC application pnpm workspace npm packages
// ---------------------------------------------------------------------------
const pcAppRoot = join(root, 'apps', 'sdkwork-clawrouter-pc');
let pcNpmPackages = [];
try {
  pcNpmPackages = collectPnpmPackages(pcAppRoot);
} catch (error) {
  console.warn(`[sbom] PC app pnpm packages omitted: ${error.message}`);
}

const allNpmPackages = [...rootNpmPackages, ...pcNpmPackages].map((pkg, index) => ({
  ...pkg,
  packageType: 'npm',
}));

// ---------------------------------------------------------------------------
// 4. Merge into SPDX package list with stable IDs
// ---------------------------------------------------------------------------
const spdxPackages = [
  ...rustPackages.map((pkg, index) => ({ ...pkg, SPDXID: `SPDXRef-Cargo-${index + 1}` })),
  ...allNpmPackages.map((pkg, index) => ({ ...pkg, SPDXID: `SPDXRef-Npm-${index + 1}` })),
];

// Build npm package name@version → SPDXID lookup for edge resolution
const npmPackageToSpdx = new Map();
allNpmPackages.forEach((pkg, index) => {
  npmPackageToSpdx.set(`${pkg.name}@${pkg.version}`, `SPDXRef-Npm-${index + 1}`);
});

// Cross-ecosystem dependency edges:
// - Every npm package is DESCRIBED by the document
// - Direct dependencies from package.json form DEPENDS_ON edges
// - Transitive importers map resolves via pnpm-lock.yaml snapshots
const npmDependencyEdges = [];

// Root workspace direct deps → their resolved versions
const rootDirectDeps = collectDirectDeps(root, npmPackageToSpdx);
const pcDirectDeps = collectDirectDeps(pcAppRoot, npmPackageToSpdx);
npmDependencyEdges.push(...rootDirectDeps, ...pcDirectDeps);

const relationships = [
  ...rustDependencies,
  ...allNpmPackages.map((_, index) => ({
    spdxElementId: 'SPDXRef-DOCUMENT',
    relationshipType: 'DESCRIBES',
    relatedSpdxElement: `SPDXRef-Npm-${index + 1}`,
  })),
  ...rustPackages.map((_, index) => ({
    spdxElementId: 'SPDXRef-DOCUMENT',
    relationshipType: 'DESCRIBES',
    relatedSpdxElement: `SPDXRef-Cargo-${index + 1}`,
  })),
  ...npmDependencyEdges,
];

const sbom = {
  spdxVersion: 'SPDX-2.3',
  dataLicense: 'CC0-1.0',
  SPDXID: 'SPDXRef-DOCUMENT',
  name: 'sdkwork-clawrouter-sbom',
  documentNamespace: `https://sdkwork.com/apps/sdkwork-clawrouter/sbom/${createdAt}`,
  creationInfo: {
    created: createdAt,
    creators: [`Tool: ${generatorName}@${generatorVersion}`],
  },
  provenance: {
    generator: generatorName,
    generatorVersion,
    generatedAt: createdAt,
    inputHashes: {
      cargoLock: hashFile(join(root, 'Cargo.lock')),
      rootPnpmLock: hashFile(join(root, 'pnpm-lock.yaml')),
      pcPnpmLock: hashFile(join(pcAppRoot, 'pnpm-lock.yaml')),
    },
  },
  packages: spdxPackages,
  relationships,
};

const sbomPath = join(outDir, 'sbom.spdx.json');
writeFileSync(sbomPath, `${JSON.stringify(sbom, null, 2)}\n`, 'utf8');
console.log(`[sbom] wrote ${sbomPath} (${spdxPackages.length} packages)`);

// ---------------------------------------------------------------------------
// 5. SHA-256 checksums for every built install package artifact
// ---------------------------------------------------------------------------
const installPackagesDir = join(root, 'dist', 'install-packages');
const artifacts = [];

if (existsSync(installPackagesDir)) {
  for (const entry of readdirSync(installPackagesDir)) {
    const entryPath = join(installPackagesDir, entry);
    if (!statSync(entryPath).isFile()) continue;
    // Skip manifest files; only checksum real artifacts
    if (entry.endsWith('.manifest.json') || entry.startsWith('install-packages-manifest')) continue;
    const digest = createHash('sha256').update(readFileSync(entryPath)).digest('hex');
    artifacts.push({
      path: relative(root, entryPath),
      algorithm: 'SHA-256',
      digest,
      sizeBytes: statSync(entryPath).size,
    });
  }
}

// Also include the clawrouter / clawrouterctl release binaries when present
const binaryCandidates = [
  join(root, 'target', 'release', 'clawrouter.exe'),
  join(root, 'target', 'release', 'clawrouter'),
  join(root, 'target', 'release', 'clawrouterctl.exe'),
  join(root, 'target', 'release', 'clawrouterctl'),
];
for (const candidate of binaryCandidates) {
  if (existsSync(candidate)) {
    const digest = createHash('sha256').update(readFileSync(candidate)).digest('hex');
    artifacts.push({
      path: relative(root, candidate),
      algorithm: 'SHA-256',
      digest,
      sizeBytes: statSync(candidate).size,
    });
  }
}

const checksums = {
  generatedAt: createdAt,
  generator: `${generatorName}@${generatorVersion}`,
  artifacts,
};

const checksumPath = join(outDir, 'checksums.json');
writeFileSync(checksumPath, `${JSON.stringify(checksums, null, 2)}\n`, 'utf8');
console.log(`[sbom] wrote ${checksumPath} (${artifacts.length} artifacts)`);

if (artifacts.length === 0) {
  console.warn(
    '[sbom] no install package artifacts found; run release packaging first to populate dist/install-packages/',
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function collectPnpmPackages(workspaceRoot) {
  const packages = [];
  const seen = new Set();

  // 1. workspace package.json direct deps
  const rootPkgPath = join(workspaceRoot, 'package.json');
  if (existsSync(rootPkgPath)) {
    const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'));
    for (const [name, version] of Object.entries({
      ...(rootPkg.dependencies ?? {}),
      ...(rootPkg.devDependencies ?? {}),
    })) {
      const key = `${name}@${version}`;
      if (seen.has(key)) continue;
      seen.add(key);
      packages.push({ name, version, license: null, source: 'pnpm' });
    }
  }

  // 2. pnpm-lock.yaml transitive deps (parse packages: section)
  const lockPath = join(workspaceRoot, 'pnpm-lock.yaml');
  if (existsSync(lockPath)) {
    const lockContent = readFileSync(lockPath, 'utf8');
    const packagesSection = lockContent.match(/^packages:\n([\s\S]*?)(?=\n\w|\n*$)/m);
    if (packagesSection) {
      const depRegex = /^\s+(['"]?)([^'"\s]+)@([^'"\s]+)\1:\s*$/gm;
      let match;
      while ((match = depRegex.exec(packagesSection[1])) !== null) {
        const name = match[2];
        const version = match[3];
        // Skip workspace: / link: / file: protocols for SPDX package name
        if (version.startsWith('workspace:') || version.startsWith('link:') || version.startsWith('file:')) {
          continue;
        }
        const key = `${name}@${version}`;
        if (seen.has(key)) continue;
        seen.add(key);
        packages.push({ name, version, license: null, source: 'pnpm-lock' });
      }
    }
  }

  return packages;
}

// Resolve direct dependencies declared in package.json (dependencies +
// devDependencies) into SPDX DEPENDS_ON edges by looking up each
// (name, declared-version-range) against the pnpm-lock resolved version map.
function collectDirectDeps(workspaceRoot, npmPackageToSpdx) {
  const edges = [];
  const rootPkgPath = join(workspaceRoot, 'package.json');
  if (!existsSync(rootPkgPath)) return edges;
  const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'));

  // Build a name → resolved-version map from pnpm-lock.yaml importers section.
  // The importers section lists direct deps with their resolved version
  // (e.g. `react: 19.0.0` or `react: ^19.0.0(react@19.0.0)`).
  const lockPath = join(workspaceRoot, 'pnpm-lock.yaml');
  const resolvedVersions = new Map();
  if (existsSync(lockPath)) {
    const lockContent = readFileSync(lockPath, 'utf8');
    const importersMatch = lockContent.match(/^importers:\n([\s\S]*?)(?=\n\w|\n*$)/m);
    if (importersMatch) {
      const importerBlock = importersMatch[1];
      // Match `    <dep-name>: <specifier>(<resolved-name>@<resolved-version>)` or
      // `    <dep-name>: <resolved-version>` forms.
      const depLineRegex = /^\s{4,}([^:\s]+):\s+([^\n]+)$/gm;
      let m;
      while ((m = depLineRegex.exec(importerBlock)) !== null) {
        const depName = m[1];
        const rest = m[2].trim();
        // Strip peer-descriptor parentheses like `19.0.0(react@19.0.0)`
        const stripped = rest.replace(/\([^)]*\)$/g, '').trim();
        if (stripped && !stripped.startsWith('workspace:') && !stripped.startsWith('link:') && !stripped.startsWith('file:')) {
          resolvedVersions.set(depName, stripped);
        }
      }
    }
  }

  const directDeps = {
    ...(rootPkg.dependencies ?? {}),
    ...(rootPkg.devDependencies ?? {}),
  };
  for (const [name] of Object.entries(directDeps)) {
    const resolved = resolvedVersions.get(name);
    if (!resolved) continue;
    const spdxId = npmPackageToSpdx.get(`${name}@${resolved}`);
    if (!spdxId) continue;
    edges.push({
      spdxElementId: 'SPDXRef-DOCUMENT',
      relationshipType: 'DEPENDS_ON',
      relatedSpdxElement: spdxId,
    });
  }

  return edges;
}

function hashFile(filePath) {
  if (!existsSync(filePath)) return null;
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

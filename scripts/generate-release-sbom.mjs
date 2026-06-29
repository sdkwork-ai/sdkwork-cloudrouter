#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later AND LicenseRef-SDKWork-Commercial-Restriction
// Generates SPDX-2.3 SBOM covering both Rust workspace (Cargo.lock) and npm
// dependency trees (pnpm-lock), plus SLSA L3 provenance checksums for every
// built release artifact.
//
// Aligns with sdkwork-specs/SUPPLY_CHAIN_SECURITY_SPEC.md §4 (SBOM/provenance)
// and §5 (signing/checksums), and sdkwork-specs/RELEASE_SPEC.md.
//
// Modes:
//   (default)            Generate sbom.spdx.json + checksums.json
//   --check               Dry-run: collect + validate, print summary, write nothing
//   --verify              Recompute artifact hashes against existing checksums.json
//   --artifacts-root DIR  Add an extra artifact scan directory
//   --use-syft            Prefer `syft` for SBOM generation when available
//
// Offline-safe: degrades gracefully when cargo/syft/cargo-audit/cosign absent.

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve, basename, relative, sep } from 'node:path';
import { createRequire } from 'node:module';

const root = resolve(import.meta.dirname, '..');
const outDir = join(root, 'deployments', 'artifacts');
mkdirSync(outDir, { recursive: true });

const generatorName = 'scripts/generate-release-sbom.mjs';
const generatorVersion = '2.0.0';
const createdAt = new Date().toISOString();
const appRequire = createRequire(import.meta.url);
// Module-level caches for npm license resolution (must be initialized before
// the top-level collection calls below, which invoke hoisted helpers).
const npmLicenseCache = new Map();
const pnpmDirLicenseCache = new Map();
// Default artifact scan directories (must be initialized before collectArtifacts
// is called at the top level).
const DEFAULT_ARTIFACT_DIRS = [
  { dir: join(root, 'dist', 'install-packages'), recursive: true, filter: null },
  { dir: join(root, 'target', 'release'), recursive: false, filter: 'binaries' },
  { dir: join(root, 'apps', 'sdkwork-clawrouter-pc', 'dist'), recursive: true, filter: 'portal' },
  {
    dir: join(root, 'apps', 'sdkwork-clawrouter-pc', 'dist', 'sdk-archives'),
    recursive: true,
    filter: null,
  },
];

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const verifyMode = argv.includes('--verify');
const checkMode = argv.includes('--check');
const useSyft = argv.includes('--use-syft');
const rootIdx = argv.indexOf('--artifacts-root');
const extraArtifactsRoot =
  rootIdx !== -1 && argv[rootIdx + 1] ? resolve(root, argv[rootIdx + 1]) : null;

if (verifyMode && checkMode) {
  console.error('[sbom] --verify and --check are mutually exclusive');
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Tool availability detection (offline-safe)
// ---------------------------------------------------------------------------
function hasBin(name) {
  const where = process.platform === 'win32' ? 'where' : 'command -v';
  try {
    const r = spawnSync(where, process.platform === 'win32' ? [name] : [name], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
    return r.status === 0;
  } catch {
    return false;
  }
}

const tools = {
  cargo: hasBin('cargo'),
  cargoAudit: hasBin('cargo-audit'),
  cargoDeny: hasBin('cargo-deny'),
  pnpm: hasBin('pnpm'),
  cosign: hasBin('cosign'),
  syft: hasBin('syft'),
};

// ---------------------------------------------------------------------------
// 1. Rust crates from Cargo.lock (primary, offline source)
//    License enriched from `cargo metadata` when available, else UNKNOWN.
// ---------------------------------------------------------------------------
let rustPackages = [];
let rustDependencies = [];
try {
  const lockParsed = parseCargoLock(join(root, 'Cargo.lock'));
  rustPackages = lockParsed.packages;
  rustDependencies = lockParsed.relationships;

  // License enrichment via cargo metadata (offline if it fails).
  const licenseMap = buildCargoLicenseMap();
  let unknownCount = 0;
  for (const pkg of rustPackages) {
    const lic =
      licenseMap.get(`${pkg.name}@${pkg.version}`) ??
      licenseMap.get(pkg.name) ??
      null;
    if (lic) {
      pkg.license = lic;
      pkg.licenseDeclared = lic;
    } else {
      pkg.license = 'UNKNOWN';
      pkg.licenseDeclared = 'UNKNOWN';
      unknownCount += 1;
    }
  }
  if (unknownCount > 0) {
    console.warn(
      `[sbom] ${unknownCount} Rust crate(s) have UNKNOWN license; cargo metadata unavailable or package has no license field`,
    );
  }
} catch (error) {
  console.warn(`[sbom] Cargo.lock parsing failed; Rust tree omitted: ${error.message}`);
}

// ---------------------------------------------------------------------------
// 2. npm packages from pnpm workspaces (root + PC app), with license resolved
//    from each installed package's package.json (handles pnpm .pnpm layout).
// ---------------------------------------------------------------------------
let rootNpmPackages = [];
let pcNpmPackages = [];
const pcAppRoot = join(root, 'apps', 'sdkwork-clawrouter-pc');
try {
  rootNpmPackages = collectPnpmPackages(root);
} catch (error) {
  console.warn(`[sbom] root pnpm packages omitted: ${error.message}`);
}
try {
  pcNpmPackages = collectPnpmPackages(pcAppRoot);
} catch (error) {
  console.warn(`[sbom] PC app pnpm packages omitted: ${error.message}`);
}

const allNpmPackages = [...rootNpmPackages, ...pcNpmPackages].map((pkg) => ({
  ...pkg,
  packageType: 'npm',
}));

// ---------------------------------------------------------------------------
// 3. Merge into SPDX package list with stable IDs
// ---------------------------------------------------------------------------
const spdxPackages = [
  ...rustPackages.map((pkg, index) => ({ ...pkg, SPDXID: `SPDXRef-Cargo-${index + 1}` })),
  ...allNpmPackages.map((pkg, index) => ({ ...pkg, SPDXID: `SPDXRef-Npm-${index + 1}` })),
];

const npmPackageToSpdx = new Map();
allNpmPackages.forEach((pkg, index) => {
  npmPackageToSpdx.set(`${pkg.name}@${pkg.version}`, `SPDXRef-Npm-${index + 1}`);
});

const npmDependencyEdges = [];
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

// ---------------------------------------------------------------------------
// 4. Vulnerability scans (cargo audit + pnpm audit), best-effort.
//    Skipped in --check (smoke test) and --verify (verify-only) modes to keep
//    those modes fast and offline-safe.
// ---------------------------------------------------------------------------
const vulnerabilities = {};
const runScanners = !checkMode && !verifyMode;
if (runScanners && tools.cargoAudit) {
  const cargoAudit = runCargoAudit();
  if (cargoAudit) vulnerabilities.cargoAudit = cargoAudit;
}
if (runScanners && tools.pnpm) {
  const pnpmAudit = runPnpmAudit();
  if (pnpmAudit) vulnerabilities.pnpmAudit = pnpmAudit;
}

// ---------------------------------------------------------------------------
// 4b. Optional syft SBOM augmentation (npm + cargo + system packages).
//     Used only with --use-syft and when the syft binary is available; merges
//     any package not already present from Cargo.lock/pnpm-lock parsing.
// ---------------------------------------------------------------------------
let syftUsed = false;
if (useSyft) {
  if (!tools.syft) {
    console.warn('[sbom] --use-syft requested but syft not found; falling back to built-in parsing');
  } else {
    const syftPkgs = runSyft();
    if (syftPkgs && syftPkgs.length) {
      const existing = new Set(spdxPackages.map((p) => `${p.packageType}:${p.name}@${p.version}`));
      let added = 0;
      const startIdx = spdxPackages.length + 1;
      for (const p of syftPkgs) {
        const key = `${p.packageType}:${p.name}@${p.version}`;
        if (existing.has(key)) continue;
        existing.add(key);
        spdxPackages.push({
          ...p,
          SPDXID: `SPDXRef-Syft-${startIdx + added}`,
        });
        relationships.push({
          spdxElementId: 'SPDXRef-DOCUMENT',
          relationshipType: 'DESCRIBES',
          relatedSpdxElement: `SPDXRef-Syft-${startIdx + added}`,
        });
        added += 1;
      }
      syftUsed = added > 0;
      console.log(`[sbom] syft merged ${added} additional package(s)`);
    }
  }
}

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
    sbomGenerators: {
      syftUsed,
      cargoMetadataUsed: tools.cargo,
      cargoLockParsed: true,
    },
    inputHashes: {
      cargoLock: hashFile(join(root, 'Cargo.lock')),
      rootPnpmLock: hashFile(join(root, 'pnpm-lock.yaml')),
      pcPnpmLock: hashFile(join(pcAppRoot, 'pnpm-lock.yaml')),
    },
  },
  packages: spdxPackages,
  relationships,
  ...(Object.keys(vulnerabilities).length ? { vulnerabilities } : {}),
};

const sbomPath = join(outDir, 'sbom.spdx.json');
const checksumPath = join(outDir, 'checksums.json');

if (checkMode) {
  console.log('[sbom] --check dry-run summary:');
  console.log(`  rust packages : ${rustPackages.length}`);
  console.log(`  npm packages  : ${allNpmPackages.length}`);
  console.log(`  relationships: ${relationships.length}`);
  console.log(`  vulnerabilities scanners: ${Object.keys(vulnerabilities).join(', ') || 'none'}`);
  const cargoLicensed = rustPackages.filter((p) => p.license && p.license !== 'UNKNOWN').length;
  const npmLicensed = allNpmPackages.filter((p) => p.license && p.license !== 'UNKNOWN').length;
  console.log(`  rust with license : ${cargoLicensed}/${rustPackages.length}`);
  console.log(`  npm  with license : ${npmLicensed}/${allNpmPackages.length}`);
  console.log(`  tools: ${JSON.stringify(tools)}`);
  console.log('[sbom] --check complete (no files written)');
  process.exit(0);
}

if (verifyMode) {
  const exitCode = verifyChecksums(checksumPath);
  process.exit(exitCode);
}

// ---------------------------------------------------------------------------
// 5. Write SBOM
// ---------------------------------------------------------------------------
writeFileSync(sbomPath, `${JSON.stringify(sbom, null, 2)}\n`, 'utf8');
console.log(`[sbom] wrote ${sbomPath} (${spdxPackages.length} packages)`);

// ---------------------------------------------------------------------------
// 6. SLSA L3 provenance checksums for built artifacts
// ---------------------------------------------------------------------------
const artifacts = collectArtifacts();

// Optional cosign signing (only when cosign present AND a key is configured).
const signEnabled = tools.cosign && (process.env.COSIGN_PRIVATE_KEY || process.env.COSIGN_SIGNING_ENABLED === 'true');
if (tools.cosign && !signEnabled) {
  console.warn('[sbom] cosign present but COSIGN_PRIVATE_KEY not set; artifacts unsigned');
}
if (signEnabled) {
  console.log('[sbom] cosign signing enabled; signing artifacts');
}

for (const artifact of artifacts) {
  if (signEnabled) {
    const sig = cosignSignBlob(artifact.absolutePath);
    artifact.signature = sig?.signature ?? null;
    artifact.certificate = sig?.certificate ?? null;
    artifact.chain = sig?.chain ?? null;
  } else {
    artifact.signature = null;
    artifact.certificate = null;
    artifact.chain = null;
  }
}

// Strip internal absolutePath before serialization.
const artifactsExport = artifacts.map(({ absolutePath, ...rest }) => rest);

const checksums = {
  generatedAt: createdAt,
  generator: `${generatorName}@${generatorVersion}`,
  artifacts: artifactsExport,
  provenance: {
    _type: 'https://in-toto.io/Statement/v0.1',
    predicateType: 'https://slsa.dev/provenance/v0.2',
    subject: artifactsExport.map((a) => ({
      name: a.name,
      digest: { sha256: a.sha256, ...(a.sha512 ? { sha512: a.sha512 } : {}) },
    })),
    predicate: {
      builder: { id: `${generatorName}@${generatorVersion}` },
      buildType: 'https://sdkwork.com/buildtypes/clawrouter/release/v1',
      invocation: {
        configSource: {
          uri: 'git+https://github.com/Sdkwork-Cloud/sdkwork-clawrouter',
          digest: {
            cargoLock: hashFile(join(root, 'Cargo.lock')),
            rootPnpmLock: hashFile(join(root, 'pnpm-lock.yaml')),
          },
        },
        parameters: {
          artifactsRoot: extraArtifactsRoot ? relative(root, extraArtifactsRoot) : null,
          generatorVersion,
        },
      },
      metadata: {
        buildStartedOn: createdAt,
        buildFinishedOn: createdAt,
        completeness: {
          parameters: true,
          environment: true,
          materials: true,
        },
        reproducible: false,
      },
      materials: [
        {
          uri: 'pkg:cargo/sdkwork-clawrouter@Cargo.lock',
          digest: { sha256: hashFile(join(root, 'Cargo.lock')) },
        },
        {
          uri: 'pkg:npm/sdkwork-clawrouter@pnpm-lock.yaml',
          digest: { sha256: hashFile(join(root, 'pnpm-lock.yaml')) },
        },
      ],
    },
  },
};

writeFileSync(checksumPath, `${JSON.stringify(checksums, null, 2)}\n`, 'utf8');
console.log(`[sbom] wrote ${checksumPath} (${artifactsExport.length} artifacts)`);

if (artifactsExport.length === 0) {
  console.warn(
    '[sbom] no artifacts found; run release packaging (cargo build --release / portal build / install packages) to populate target/release, apps/sdkwork-clawrouter-pc/dist, or dist/install-packages',
  );
}

// ===========================================================================
// Helpers
// ===========================================================================

// --- Cargo.lock parser -----------------------------------------------------
// Returns { packages: [{name,version,source,checksum,dependencies,license,packageType:'cargo'}],
//           relationships: [{spdxElementId,relationshipType,relatedSpdxElement}] }
function parseCargoLock(lockPath) {
  if (!existsSync(lockPath)) {
    console.warn('[sbom] Cargo.lock not found; Rust tree omitted');
    return { packages: [], relationships: [] };
  }
  const content = readFileSync(lockPath, 'utf8');
  const packages = [];
  const blocks = content.split(/^\[\[package\]\]\n/m).slice(1);

  for (const block of blocks) {
    const name = matchField(block, 'name');
    const version = matchField(block, 'version');
    if (!name || !version) continue;
    const source = matchField(block, 'source');
    const checksum = matchField(block, 'checksum');
    const deps = matchList(block, 'dependencies');
    packages.push({
      name,
      version,
      source: source ?? null,
      checksum: checksum ?? null,
      dependencies: deps,
      license: null, // enriched later
      packageType: 'cargo',
    });
  }

  // Build DEPENDS_ON relationships by name@version lookup.
  const keyToSpdx = new Map();
  packages.forEach((pkg, index) => {
    keyToSpdx.set(`${pkg.name}@${pkg.version}`, `SPDXRef-Cargo-${index + 1}`);
  });
  const relationships = [];
  for (const pkg of packages) {
    const sourceSpdx = keyToSpdx.get(`${pkg.name}@${pkg.version}`);
    if (!sourceSpdx) continue;
    for (const depName of pkg.dependencies) {
      // Cargo.lock dependency entries are bare names (sometimes "name version").
      // Resolve by name only to the first matching crate.
      const depPkg = packages.find((p) => p.name === depName || p.name === depName.split(' ')[0]);
      if (!depPkg) continue;
      const targetSpdx = keyToSpdx.get(`${depPkg.name}@${depPkg.version}`);
      if (targetSpdx) {
        relationships.push({
          spdxElementId: sourceSpdx,
          relationshipType: 'DEPENDS_ON',
          relatedSpdxElement: targetSpdx,
        });
      }
    }
  }
  return { packages, relationships };
}

function matchField(block, field) {
  const m = block.match(new RegExp(`^${field}\\s*=\\s*"([^"]*)"`, 'm'));
  return m ? m[1] : null;
}

function matchList(block, field) {
  const m = block.match(new RegExp(`^${field}\\s*=\\s*\\[([^\\]]*)\\]`, 'm'));
  if (!m) return [];
  return m[1]
    .split('\n')
    .map((l) => l.trim().replace(/^"|"$/g, '').replace(/",?$/, ''))
    .filter(Boolean);
}

// --- cargo metadata license map -------------------------------------------
// Uses full `cargo metadata` (with deps) so the license map covers every
// transitive crate in Cargo.lock, not just workspace members.
function buildCargoLicenseMap() {
  if (!tools.cargo) return new Map();
  try {
    const r = spawnSync('cargo', ['metadata', '--format-version=1'], {
      cwd: root,
      encoding: 'utf8',
      timeout: 180000,
      maxBuffer: 64 * 1024 * 1024,
    });
    if (r.status !== 0 || !r.stdout) {
      console.warn(`[sbom] cargo metadata failed (status ${r.status}); license enrichment skipped`);
      return new Map();
    }
    return parseCargoMetadataLicenses(r.stdout);
  } catch (error) {
    console.warn(`[sbom] cargo metadata error; license enrichment skipped: ${error.message}`);
    return new Map();
  }
}

function parseCargoMetadataLicenses(stdout) {
  const map = new Map();
  try {
    const meta = JSON.parse(stdout);
    for (const pkg of meta.packages ?? []) {
      const key = `${pkg.name}@${pkg.version}`;
      map.set(key, pkg.license ?? null);
      if (!map.has(pkg.name)) map.set(pkg.name, pkg.license ?? null);
    }
  } catch (error) {
    console.warn(`[sbom] cargo metadata JSON parse failed: ${error.message}`);
  }
  return map;
}

// --- npm package collection + license resolution --------------------------
function collectPnpmPackages(workspaceRoot) {
  const packages = [];
  const seen = new Set();

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
      packages.push({
        name,
        version,
        license: resolveNpmLicense(workspaceRoot, name),
        source: 'pnpm',
      });
    }
  }

  const lockPath = join(workspaceRoot, 'pnpm-lock.yaml');
  if (existsSync(lockPath)) {
    const lockContent = readFileSync(lockPath, 'utf8');
    const sectionContent = extractPnpmLockSection(lockContent, 'packages');
    if (sectionContent) {
      // pnpm-lock v9 package keys use the actual npm name (with `/`):
      //   '@adobe/css-tools@4.4.4':
      //   react@19.2.4:
      // We match the quoted key, then split name@version using the scope-aware
      // rule (the `@` separating name from version is the LAST `@` for
      // non-scoped packages, or the SECOND `@` for scoped packages).
      const keyRegex = /^\s+['"]?([^'"\n]+?)['"]?:\s*$/gm;
      let match;
      while ((match = keyRegex.exec(sectionContent)) !== null) {
        const parsed = parseLockPackageKey(match[1]);
        if (!parsed) continue;
        const { name, version } = parsed;
        if (
          version.startsWith('workspace:') ||
          version.startsWith('link:') ||
          version.startsWith('file:')
        ) {
          continue;
        }
        const key = `${name}@${version}`;
        if (seen.has(key)) continue;
        seen.add(key);
        packages.push({
          name,
          version,
          license: resolveNpmLicense(workspaceRoot, name),
          source: 'pnpm-lock',
        });
      }
    }
  }

  return packages;
}

// Extract a top-level YAML section (e.g. "packages", "snapshots") from a
// pnpm-lock.yaml file. Returns the section body (lines between the header and
// the next top-level key), or null when the section is absent. Replaces the
// previous regex approach which broke under the multiline flag because `\n*$`
// matched at the end of the first line.
function extractPnpmLockSection(lockContent, sectionName) {
  const header = `\n${sectionName}:\n`;
  const start = lockContent.indexOf(header);
  if (start === -1) return null;
  const afterHeader = start + header.length;
  const rest = lockContent.slice(afterHeader);
  // The next top-level section starts with a lowercase word + colon at column 0.
  const nextSectionMatch = rest.match(/\n[a-z][a-z_-]*:\n/);
  return nextSectionMatch ? rest.slice(0, nextSectionMatch.index) : rest;
}

// Parse a pnpm-lock v9 `packages:` key into {name, version}.
// Keys use the actual npm name format (with `/`), e.g.:
//   '@adobe/css-tools@4.4.4'  -> { name: '@adobe/css-tools', version: '4.4.4' }
//   react@19.2.4              -> { name: 'react', version: '19.2.4' }
// Returns null for keys without a version or with a non-semver version prefix.
function parseLockPackageKey(key) {
  let name, version;
  if (key.startsWith('@')) {
    const secondAt = key.indexOf('@', 1);
    if (secondAt === -1) return null;
    name = key.slice(0, secondAt);
    version = key.slice(secondAt + 1);
  } else {
    const at = key.indexOf('@');
    if (at === -1) return null;
    name = key.slice(0, at);
    version = key.slice(at + 1);
  }
  if (!name || !version) return null;
  return { name, version };
}

// Resolve license from an installed package's package.json. Follows pnpm
// .pnpm symlinks via Node resolution, with a .pnpm directory fallback for
// transitive deps that are not hoisted to the top-level node_modules. Handles
// "UNLICENSED", "SEE LICENSE IN LICENSE", "MIT OR Apache-2.0", and the
// deprecated `licenses` array form. Returns null when unresolved.
function resolveNpmLicense(workspaceRoot, name) {
  // Cache by name (licenses rarely differ across patch versions).
  if (npmLicenseCache.has(name)) return npmLicenseCache.get(name);
  let license = null;
  try {
    const pkgJsonPath = appRequire.resolve(`${name}/package.json`, { paths: [workspaceRoot] });
    const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
    license = normalizeLicense(pkg.license ?? pkg.licenses ?? null);
  } catch {
    // Transitive deps live under node_modules/.pnpm/<entry>/node_modules/<name>.
    license = getPnpmDirLicenseMap(workspaceRoot).get(name) ?? null;
  }
  npmLicenseCache.set(name, license);
  return license;
}

// Lazily build a name -> license map by scanning the pnpm virtual store
// (node_modules/.pnpm). Each entry dir encodes <name>@<version>[_<peers>].
// Scans every entry (even duplicate names with different peer sets) until a
// license is found, so transitive deps installed under non-default peer
// descriptors are still resolved.
function getPnpmDirLicenseMap(workspaceRoot) {
  if (pnpmDirLicenseCache.has(workspaceRoot)) return pnpmDirLicenseCache.get(workspaceRoot);
  const map = new Map();
  const pnpmDir = join(workspaceRoot, 'node_modules', '.pnpm');
  if (!existsSync(pnpmDir)) {
    pnpmDirLicenseCache.set(workspaceRoot, map);
    return map;
  }
  let entries;
  try {
    entries = readdirSync(pnpmDir);
  } catch {
    pnpmDirLicenseCache.set(workspaceRoot, map);
    return map;
  }
  for (const entry of entries) {
    const parsed = parsePnpmEntryName(entry);
    if (!parsed || !parsed.name || !parsed.version) continue;
    if (map.has(parsed.name)) continue;
    // Primary path: node_modules/.pnpm/<entry>/node_modules/<name>/package.json
    const pkgJson = join(pnpmDir, entry, 'node_modules', parsed.name, 'package.json');
    if (!existsSync(pkgJson)) continue;
    try {
      const pkg = JSON.parse(readFileSync(pkgJson, 'utf8'));
      const lic = normalizeLicense(pkg.license ?? pkg.licenses ?? null);
      if (lic) map.set(parsed.name, lic);
    } catch {
      /* ignore unreadable package.json */
    }
  }
  pnpmDirLicenseCache.set(workspaceRoot, map);
  return map;
}

// Parse a pnpm .pnpm entry dir name into {name, version}.
//   '@radix-ui+react-slot@1.2.4_@types+react@19.2.14_react@19.2.4' ->
//     { name: '@radix-ui/react-slot', version: '1.2.4' }
//   'react@19.2.4' -> { name: 'react', version: '19.2.4' }
// Scoped packages use `+` instead of `/`; the version separator is the `@`
// after the package name. Peer-descriptor suffixes (`_<peers>` or `(<peers>)`)
// are stripped from the version.
function parsePnpmEntryName(entry) {
  let name, version;
  if (entry.startsWith('@')) {
    const secondAt = entry.indexOf('@', 1);
    if (secondAt === -1) return null;
    // Replace only the FIRST `+` (scope separator); package names with `+`
    // are not valid in the npm registry.
    name = entry.slice(0, secondAt).replace('+', '/');
    version = entry.slice(secondAt + 1);
  } else {
    const at = entry.indexOf('@');
    if (at === -1) return null;
    name = entry.slice(0, at);
    version = entry.slice(at + 1);
  }
  // Strip pnpm peer-descriptor suffixes: '_<peers>' or '(<peers>)'.
  const cleanVersion = version.split(/[_(]/)[0];
  if (!cleanVersion) return null;
  return { name, version: cleanVersion };
}

function normalizeLicense(raw) {
  if (raw == null) return null;
  if (typeof raw === 'string') return raw.trim() || null;
  if (Array.isArray(raw)) {
    const items = raw
      .map((item) => (typeof item === 'string' ? item : item && item.type ? item.type : null))
      .filter(Boolean);
    return items.length ? items.join(' OR ') : null;
  }
  if (typeof raw === 'object' && raw.type) return raw.type;
  return null;
}

// Resolve direct dependencies declared in package.json into SPDX DEPENDS_ON
// edges by looking up each direct dep name against the collected npm package
// SPDX ID map. Uses the pnpm-lock `importers:` section to find resolved
// versions (stripping peer-descriptor suffixes) so we can map name → SPDX ID.
function collectDirectDeps(workspaceRoot, npmPackageToSpdx) {
  const edges = [];
  const rootPkgPath = join(workspaceRoot, 'package.json');
  if (!existsSync(rootPkgPath)) return edges;
  const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'));

  // Build name -> resolved version map from the pnpm-lock importers section.
  // The importers section lists each direct dependency with its resolved version:
  //   importers:
  //     .:
  //       dependencies:
  //         '@monaco-editor/loader':
  //           specifier: ^1.7.0
  //           version: 1.7.0
  const resolvedVersions = new Map();
  const lockPath = join(workspaceRoot, 'pnpm-lock.yaml');
  if (existsSync(lockPath)) {
    const lockContent = readFileSync(lockPath, 'utf8');
    const importersContent = extractPnpmLockSection(lockContent, 'importers');
    if (importersContent) {
      // Track the current dependency name as we scan dependency entries.
      // A dep name line looks like `  '@scope/name':` or `  name:` (no value
      // after colon). The next `version:` line gives the resolved version.
      let currentDepName = null;
      for (const line of importersContent.split('\n')) {
        // Dep name line: indented key with optional quotes, ending with `:`
        // and no value on the same line.
        const depNameMatch = line.match(/^\s+['"]?(@[^'"\s]+|[^'"\s]+)['"]?:\s*$/);
        if (depNameMatch) {
          currentDepName = depNameMatch[1];
          continue;
        }
        // Version line: `version: <resolved>` (may have peer-descriptor suffix).
        const versionMatch = line.match(/^\s+version:\s+(\S+)/);
        if (versionMatch && currentDepName) {
          const rawVersion = versionMatch[1];
          // Strip peer-descriptor suffixes: `1.2.4(@types/react@19.2.14)` or
          // `1.2.4_@types+react@19.2.14`.
          const cleanVersion = rawVersion.split(/[(_]/)[0];
          if (
            cleanVersion &&
            !cleanVersion.startsWith('workspace:') &&
            !cleanVersion.startsWith('link:') &&
            !cleanVersion.startsWith('file:')
          ) {
            resolvedVersions.set(currentDepName, cleanVersion);
          }
          currentDepName = null;
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

// --- Vulnerability scanners ------------------------------------------------
function runCargoAudit() {
  try {
    const r = spawnSync('cargo', ['audit', '--json'], {
      cwd: root,
      encoding: 'utf8',
      timeout: 180000,
      maxBuffer: 32 * 1024 * 1024,
    });
    // cargo audit exits non-zero when vulnerabilities are found; still parse stdout.
    const out = r.stdout || '';
    if (!out.trim()) {
      return { scanner: 'cargo-audit', available: true, summary: 'no output' };
    }
    try {
      const data = JSON.parse(out);
      const advisories = data.advisories?.warnings ?? data.advisories ?? [];
      const list = (Array.isArray(advisories) ? advisories : []).map((a) => ({
        package: a.package ?? a.advisory?.affected_package ?? null,
        id: a.advisory?.id ?? a.id ?? null,
        severity: a.advisory?.severity ?? a.severity ?? null,
        title: a.advisory?.title ?? a.title ?? null,
      }));
      return {
        scanner: 'cargo-audit',
        available: true,
        total: list.length,
        items: list,
      };
    } catch {
      return { scanner: 'cargo-audit', available: true, raw: out.slice(0, 2000) };
    }
  } catch (error) {
    console.warn(`[sbom] cargo audit skipped: ${error.message}`);
    return null;
  }
}

function runPnpmAudit() {
  try {
    const r = spawnSync(
      process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
      ['audit', '--prod', '--json'],
      { cwd: root, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 },
    );
    const out = r.stdout || '';
    if (!out.trim()) {
      return { scanner: 'pnpm-audit', available: true, summary: 'no output' };
    }
    try {
      const data = JSON.parse(out);
      const vulns = data.vulnerabilities ?? {};
      const items = Object.entries(vulns).map(([name, v]) => ({
        package: name,
        severity: v.severity ?? null,
        via: Array.isArray(v.via) ? v.via.map((x) => (typeof x === 'string' ? x : x?.title ?? x?.name ?? null)).filter(Boolean) : [],
        fixAvailable: v.fixAvailable ?? null,
      }));
      return {
        scanner: 'pnpm-audit',
        available: true,
        total: items.length,
        summary: data.metadata?.vulnerabilities ?? null,
        items,
      };
    } catch {
      return { scanner: 'pnpm-audit', available: true, raw: out.slice(0, 2000) };
    }
  } catch (error) {
    console.warn(`[sbom] pnpm audit skipped: ${error.message}`);
    return null;
  }
}

// --- syft SBOM augmentation ------------------------------------------------
// Runs `syft dir:<root> -o spdx-json` and normalizes its package list into the
// internal shape. Covers npm + cargo + system packages. Returns null when syft
// is unavailable or fails so the caller falls back to built-in parsing.
function runSyft() {
  try {
    const r = spawnSync('syft', ['dir:.', '-o', 'spdx-json'], {
      cwd: root,
      encoding: 'utf8',
      timeout: 180000,
      maxBuffer: 64 * 1024 * 1024,
    });
    if (r.status !== 0 || !r.stdout) {
      console.warn(`[sbom] syft failed (status ${r.status}); falling back to built-in parsing`);
      return null;
    }
    const data = JSON.parse(r.stdout);
    const typeMap = { npm: 'npm', cargo: 'cargo', apk: 'system', deb: 'system', rpm: 'system' };
    const out = [];
    for (const p of data.packages ?? []) {
      const packageType = typeMap[p.externalRefs?.[0]?.type?.split('-')?.[0]] ?? 'system';
      out.push({
        name: p.name,
        version: p.versionInfo ?? p.version ?? null,
        license: p.licenseConcluded ?? p.licenseDeclared ?? null,
        source: p.downloadLocation ?? null,
        packageType,
      });
    }
    return out;
  } catch (error) {
    console.warn(`[sbom] syft skipped: ${error.message}`);
    return null;
  }
}

// --- Artifact collection ---------------------------------------------------
function collectArtifacts() {
  const artifacts = [];
  const seen = new Set();

  const scanDirs = [...DEFAULT_ARTIFACT_DIRS];
  if (extraArtifactsRoot) {
    scanDirs.push({ dir: extraArtifactsRoot, recursive: true, filter: null });
  }

  for (const { dir, recursive, filter } of scanDirs) {
    if (!existsSync(dir)) continue;
    const files = recursive ? walkFiles(dir) : readdirSync(dir).map((f) => join(dir, f));
    for (const filePath of files) {
      let st;
      try {
        st = statSync(filePath);
      } catch {
        continue;
      }
      if (!st.isFile()) continue;
      const name = basename(filePath);

      if (filter === 'binaries') {
        // Only the release executables, not .d/.pdb/.exp/.lib/intermediates.
        if (!/^clawrouter(ctl)?(\.exe)?$/i.test(name)) continue;
      }
      if (filter === 'portal') {
        // Skip source maps and dotfiles to keep provenance focused on shipped assets.
        if (name.endsWith('.map') || name.startsWith('.')) continue;
      }
      // Generic skip for non-artifact manifest files.
      if (name.endsWith('.manifest.json') || name.startsWith('install-packages-manifest')) continue;

      const relPath = relative(root, filePath);
      if (seen.has(relPath)) continue;
      seen.add(relPath);

      const data = readFileSync(filePath);
      artifacts.push({
        name,
        path: relPath.split(sep).join('/'),
        size: st.size,
        sha256: createHash('sha256').update(data).digest('hex'),
        sha512: createHash('sha512').update(data).digest('hex'),
        algorithm: 'SHA-256',
        generatedAt: createdAt,
        generator: `${generatorName}@${generatorVersion}`,
        absolutePath: filePath,
      });
    }
  }

  return artifacts;
}

function walkFiles(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = readdirSync(current);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(current, entry);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        stack.push(full);
      } else if (st.isFile()) {
        out.push(full);
      }
    }
  }
  return out;
}

// --- cosign signing --------------------------------------------------------
function cosignSignBlob(filePath) {
  if (!tools.cosign) return null;
  try {
    const sigPath = `${filePath}.sig`;
    const certPath = `${filePath}.pem`;
    const r = spawnSync(
      'cosign',
      [
        'sign-blob',
        '--yes',
        '--output-signature',
        sigPath,
        '--output-certificate',
        certPath,
        filePath,
      ],
      {
        cwd: root,
        encoding: 'utf8',
        timeout: 120000,
        env: process.env,
      },
    );
    if (r.status !== 0) {
      console.warn(`[sbom] cosign sign-blob failed for ${basename(filePath)}: ${(r.stderr || '').trim()}`);
      return null;
    }
    let signature = null;
    let certificate = null;
    try {
      signature = readFileSync(sigPath, 'utf8').trim();
    } catch {
      /* ignore */
    }
    try {
      certificate = readFileSync(certPath, 'utf8').trim();
    } catch {
      /* ignore */
    }
    return { signature, certificate, chain: null };
  } catch (error) {
    console.warn(`[sbom] cosign sign error: ${error.message}`);
    return null;
  }
}

// --- verify mode -----------------------------------------------------------
function verifyChecksums(checksumsPath) {
  if (!existsSync(checksumsPath)) {
    console.error(`[sbom] --verify: checksums.json not found at ${checksumsPath}`);
    return 1;
  }
  const stored = JSON.parse(readFileSync(checksumsPath, 'utf8'));
  const artifacts = stored.artifacts ?? [];
  if (!artifacts.length) {
    console.warn('[sbom] --verify: stored artifacts list is empty; nothing to verify');
    return 0;
  }
  let ok = 0;
  let mismatched = 0;
  let missing = 0;
  for (const a of artifacts) {
    const absPath = join(root, a.path);
    if (!existsSync(absPath)) {
      console.error(`[sbom] MISSING: ${a.path}`);
      missing += 1;
      continue;
    }
    const digest = createHash('sha256').update(readFileSync(absPath)).digest('hex');
    if (digest === a.sha256) {
      ok += 1;
    } else {
      console.error(`[sbom] MISMATCH: ${a.path} (expected ${a.sha256}, got ${digest})`);
      mismatched += 1;
    }
  }
  console.log(`[sbom] --verify: ${ok} ok, ${mismatched} mismatched, ${missing} missing (of ${artifacts.length})`);
  return mismatched > 0 || missing > 0 ? 1 : 0;
}

function hashFile(filePath) {
  if (!existsSync(filePath)) return null;
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

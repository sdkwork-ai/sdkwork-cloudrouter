#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const outDir = join(root, 'deployments', 'artifacts');
mkdirSync(outDir, { recursive: true });

const metadata = JSON.parse(
  execSync('cargo metadata --format-version=1 --no-deps', {
    cwd: root,
    encoding: 'utf8',
  }),
);

const packages = metadata.packages.map((pkg) => ({
  name: pkg.name,
  version: pkg.version,
  license: pkg.license ?? null,
  source: pkg.source ?? null,
}));

const sbom = {
  spdxVersion: 'SPDX-2.3',
  dataLicense: 'CC0-1.0',
  SPDXID: 'SPDXRef-DOCUMENT',
  name: 'sdkwork-clawrouter-sbom',
  documentNamespace: 'https://sdkwork.com/apps/sdkwork-clawrouter/sbom',
  creationInfo: {
    created: new Date().toISOString(),
    creators: ['Tool: scripts/generate-release-sbom.mjs'],
  },
  packages: packages.map((pkg, index) => ({
    ...pkg,
    SPDXID: `SPDXRef-Package-${index + 1}`,
  })),
};

const sbomPath = join(outDir, 'sbom.spdx.json');
writeFileSync(sbomPath, `${JSON.stringify(sbom, null, 2)}\n`, 'utf8');

const binaryCandidates = [
  join(root, 'target', 'release', 'clawrouter.exe'),
  join(root, 'target', 'release', 'clawrouter'),
  join(root, 'target', 'release', 'clawrouterctl.exe'),
  join(root, 'target', 'release', 'clawrouterctl'),
];

let checksumSource = null;
let checksumPathLabel = 'target/release/clawrouter';
for (const candidate of binaryCandidates) {
  try {
    checksumSource = readFileSync(candidate);
    checksumPathLabel = candidate.replace(`${root}\\`, '').replace(`${root}/`, '');
    break;
  } catch {
    // try next candidate
  }
}

if (!checksumSource) {
  throw new Error(
    'No clawrouter release binary found; run `cargo build -p sdkwork-claw-installer --bin clawrouterctl --release` and gateway build first',
  );
}

const digest = createHash('sha256').update(checksumSource).digest('hex');
const checksums = {
  generatedAt: new Date().toISOString(),
  artifacts: [
    {
      path: checksumPathLabel,
      algorithm: 'SHA-256',
      digest,
    },
  ],
};

const checksumPath = join(outDir, 'checksums.json');
writeFileSync(checksumPath, `${JSON.stringify(checksums, null, 2)}\n`, 'utf8');
console.log(`[sbom] wrote ${sbomPath}`);
console.log(`[sbom] wrote ${checksumPath}`);

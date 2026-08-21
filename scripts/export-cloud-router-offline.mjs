#!/usr/bin/env node
/**
 * Builds an offline deployment bundle for air-gapped / intranet customers:
 * the container image (docker save), the compose stack, config templates and
 * the deployment guide — everything needed to `docker load` + `docker compose
 * up` without any internet access.
 *
 * Usage:
 *   pnpm build:container   # first, produce cloudrouter:local
 *   node scripts/export-cloud-router-offline.mjs [--version 0.3.0] [--out dist/offline]
 *
 * Output: dist/offline/cloudrouter-offline-<version>.tar.gz containing:
 *   cloudrouter-<version>.tar          # docker save image (load with: docker load -i)
 *   docker-compose.yml                 # prebuilt compose stack
 *   docker/.env.example                # deployment configuration template
 *   docker/config/config.toml     # runtime config template
 *   docs/installation/docker-deployment.md  # deployment guide
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync, statSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OFFLINE_IMAGE = ['cloudrouter', 'local'].join(':');

function parseArgs(argv) {
  const options = { version: '0.3.0', out: 'dist/offline', image: DEFAULT_OFFLINE_IMAGE };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--version') options.version = argv[++i];
    else if (arg === '--out') options.out = argv[++i];
    else if (arg === '--image') options.image = argv[++i];
    else if (arg === '--help') {
      console.log('Usage: node scripts/export-cloud-router-offline.mjs [--version 0.3.0] [--out dist/offline] [--image cloudrouter:local]');
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return options;
}

function dockerAvailable() {
  try {
    execFileSync('docker', ['info', '--format', '{{.ServerVersion}}'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!dockerAvailable()) {
    throw new Error('docker is not available; build the image first with `pnpm build:container`');
  }
  const outDir = join(root, options.out);
  const staging = join(outDir, `cloudrouter-offline-${options.version}`);
  mkdirSync(staging, { recursive: true });

  // 1. docker save the image.
  const imageTar = join(staging, `cloudrouter-${options.version}.tar`);
  console.log(`[offline] saving image ${options.image} -> ${imageTar}`);
  execFileSync('docker', ['save', '-o', imageTar, options.image], { stdio: 'inherit' });

  // 2. Copy the compose stack and templates.
  const copies = [
    ['docker-compose.yml', 'docker-compose.yml'],
    ['docker/.env.example', 'docker/.env.example'],
    ['docker/config/config.toml', 'docker/config/config.toml'],
    ['docker/postgres/init/001-create-schema.sql', 'docker/postgres/init/001-create-schema.sql'],
    ['docs/installation/docker-deployment.md', 'docs/installation/docker-deployment.md'],
  ];
  for (const [source, target] of copies) {
    const sourcePath = join(root, source);
    if (!existsSync(sourcePath)) {
      throw new Error(`missing deployment asset: ${sourcePath}`);
    }
    const targetPath = join(staging, target);
    mkdirSync(dirname(targetPath), { recursive: true });
    execFileSync('cp', [sourcePath, targetPath], { stdio: 'inherit' });
  }

  // 3. README with offline install steps.
  const readme = `# Cloud Router Offline Deployment Bundle v${options.version}

This bundle deploys Cloud Router without internet access.

## Requirements
- Docker Engine 24+ (with docker compose plugin) on the target host.

## Install
1. Copy the bundle to the target host and unpack:
   tar -xzf cloudrouter-offline-${options.version}.tar.gz
   cd cloudrouter-offline-${options.version}
2. Load the image:
   docker load -i cloudrouter-${options.version}.tar
3. Configure (optional): copy docker/.env.example to .env and edit;
   edit docker/config/config.toml for runtime settings.
4. Start:
   docker compose up -d
5. Verify:
   curl http://127.0.0.1:3903/readyz
   Open http://localhost:3903 and sign in.

See docs/installation/docker-deployment.md for full details (ports,
configuration, CORS domains, backup/restore, upgrades).
`;
  const readmePath = join(staging, 'README-OFFLINE.md');
  writeFileSync(readmePath, readme);

  // 4. Compress.
  const bundle = join(outDir, `cloudrouter-offline-${options.version}.tar.gz`);
  execFileSync('tar', ['-czf', bundle, '-C', outDir, `cloudrouter-offline-${options.version}`], { stdio: 'inherit' });
  const bytes = statSync(bundle).size;
  rmSync(staging, { recursive: true, force: true });
  console.log(`[offline] bundle ready: ${bundle} (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
}

try {
  main();
} catch (error) {
  console.error(`[offline] error: ${error.message}`);
  process.exit(1);
}

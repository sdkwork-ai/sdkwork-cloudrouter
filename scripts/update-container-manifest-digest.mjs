#!/usr/bin/env node
// update-container-manifest-digest.mjs
//
// Bind a published container image into the application distribution matrix
// (APP_MANIFEST_SPEC.md section 10 Package Matrix and section 11 Latest Download
// Resolution). A CONTAINER_IMAGE package must carry an immutable OCI digest in
// both `url` and `checksum` (APP_MANIFEST_SPEC.md section 10, rule at
// 'Container packages must use an immutable OCI reference or digest-bearing
// URL'), so the values can only be written after the packaging workflow has
// pushed the image. Run this once per release with the dist/container-image.json
// produced by each architecture job.
//
// Usage:
//   node scripts/update-container-manifest-digest.mjs \
//     --manifest dist/container-image.json \
//     --manifest dist/container-image-arm64.json
//   node scripts/update-container-manifest-digest.mjs --manifest <...> --check

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_APP_CONFIG = 'agent.app.config.json';
const SUPPORTED_DEPLOYMENT_PROFILES = ['standalone', 'cloud'];
// The operator/default channel is the single-container `standalone` image, so it
// stays the manifest default package id even when a cloud image also ships.
const DEFAULT_DEPLOYMENT_PROFILE = 'standalone';
const OCI_DIGEST_PATTERN = /^([^\s@]+)@(sha256:[a-f0-9]{64})$/u;
const CONTAINER_PACKAGE_ID_PATTERN = /^linux-(x64|arm64)-container$/u;
const SEMVER_PATTERN = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u;

function printHelp() {
  console.log([
    'Usage: node scripts/update-container-manifest-digest.mjs [options]',
    '',
    'Options:',
    '  --manifest <path>    dist/container-image.json from a pushed image build',
    '                       (repeat once per architecture and deployment profile;',
    '                       the file records both).',
    '  --app-config <path>  App manifest path (default agent.app.config.json).',
    '  --check              Fail when the manifest is out of sync; write nothing.',
    '  --json               Print a machine-readable summary.',
    '  -h, --help           Show this help.',
  ].join('\n'));
}

function requireValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(flag + ' requires a value');
  return value;
}

function parseArgs(argv) {
  const settings = { manifests: [], appConfig: DEFAULT_APP_CONFIG, check: false, json: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--manifest') { settings.manifests.push(requireValue(argv, index, arg)); index += 1; }
    else if (arg === '--app-config') { settings.appConfig = requireValue(argv, index, arg); index += 1; }
    else if (arg === '--check') settings.check = true;
    else if (arg === '--json') settings.json = true;
    else if (arg === '-h' || arg === '--help') settings.help = true;
    else throw new Error('Unknown option: ' + arg);
  }
  return settings;
}

// One published architecture: the image manifest records the registry locator.
function readImageManifest(file, root = REPO_ROOT) {
  const absolute = path.resolve(root, file);
  const manifest = JSON.parse(readFileSync(absolute, 'utf8'));
  const version = String(manifest?.version ?? '').trim();
  if (!SEMVER_PATTERN.test(version)) throw new Error(file + ': version must use SemVer');
  const packageMatch = CONTAINER_PACKAGE_ID_PATTERN.exec(String(manifest?.packageId ?? ''));
  if (!packageMatch) throw new Error(file + ': packageId must be linux-<x64|arm64>-container');
  const locatorMatch = OCI_DIGEST_PATTERN.exec(String(manifest?.repoDigest ?? ''));
  if (!locatorMatch) {
    throw new Error(file + ': repoDigest must be <repository>@sha256:<64 hex>; build the image with --push before updating the manifest');
  }
  const arch = packageMatch[1];
  const deploymentProfile = String(manifest?.deploymentProfile ?? '').trim();
  if (!SUPPORTED_DEPLOYMENT_PROFILES.includes(deploymentProfile)) {
    throw new Error(file + ': deploymentProfile must be ' + SUPPORTED_DEPLOYMENT_PROFILES.join(' or ') + '; rebuild the image with --deployment-profile');
  }
  return {
    arch,
    deploymentProfile,
    version,
    packageId: 'container-' + arch + '-' + deploymentProfile + '-container-oci',
    repository: locatorMatch[1],
    digestHex: locatorMatch[2].slice('sha256:'.length),
    locator: locatorMatch[0],
    sizeBytes: Number.isSafeInteger(manifest?.sizeBytes) ? manifest.sizeBytes : null,
  };
}

function containerPackageEntry(image) {
  const channel = image.deploymentProfile === 'cloud' ? 'Cloud Container Image' : 'Container Image';
  return {
    id: image.packageId,
    name: 'SDKWork Cloud Router Linux ' + image.arch + ' ' + channel,
    sourceType: 'CONTAINER_IMAGE',
    packageFormat: 'DOCKER_IMAGE',
    platform: 'API',
    architecture: image.arch,
    profileBinding: 'fixed',
    deploymentProfile: image.deploymentProfile,
    runtimeTarget: 'container',
    targetPlatform: 'linux',
    enabled: true,
    url: 'https://' + image.locator,
    checksumAlgorithm: 'SHA-256',
    checksum: image.digestHex,
    ...(image.sizeBytes ? { sizeBytes: image.sizeBytes } : {}),
  };
}

function archRank(arch) {
  return arch === 'x64' ? 0 : 1;
}

function profileRank(profile) {
  return profile === DEFAULT_DEPLOYMENT_PROFILE ? 0 : 1;
}

export function applyContainerDigests(appConfig, images) {
  const versions = new Set(images.map((image) => image.version));
  if (versions.size !== 1) throw new Error('all image manifests must share one release version');
  const version = [...versions][0];
  const released = images.slice().sort((left, right) => profileRank(left.deploymentProfile) - profileRank(right.deploymentProfile)
    || archRank(left.arch) - archRank(right.arch));
  const seen = new Set();
  for (const image of released) {
    const key = image.deploymentProfile + '/' + image.arch;
    if (seen.has(key)) throw new Error('duplicate image manifest for ' + key);
    seen.add(key);
  }
  const installConfig = appConfig.artifacts?.installConfig;
  if (!installConfig || !Array.isArray(installConfig.packages)) {
    throw new Error('agent.app.config.json artifacts.installConfig.packages must be an array');
  }
  const byId = new Map(installConfig.packages.map((item) => [item.id, item]));
  for (const image of released) {
    const entry = containerPackageEntry(image);
    const index = installConfig.packages.findIndex((item) => item.id === image.packageId);
    if (index >= 0) installConfig.packages[index] = entry;
    else installConfig.packages.unshift(entry);
    byId.set(image.packageId, entry);
  }
  const defaultPackageId = (released.find((image) => image.deploymentProfile === DEFAULT_DEPLOYMENT_PROFILE && image.arch === 'x64')
    ?? released[0]).packageId;
  installConfig.defaultPackageId = defaultPackageId;
  if (appConfig.publish && typeof appConfig.publish === 'object') {
    appConfig.publish.defaultPackageId = defaultPackageId;
  }
  const notes = appConfig.release?.notes;
  const current = Array.isArray(notes) ? notes.find((note) => note?.current === true) : null;
  if (!current) throw new Error('agent.app.config.json release.notes must contain exactly one current entry');
  if (current.version !== version) {
    throw new Error('current release note version ' + current.version + ' does not match the packaged version ' + version);
  }
  current.packageIds = released.map((image) => image.packageId);
  return { version, defaultPackageId, packageIds: current.packageIds };
}

function main(argv = process.argv.slice(2), root = REPO_ROOT) {
  const settings = parseArgs(argv);
  if (settings.help) { printHelp(); return 0; }
  if (settings.manifests.length === 0) throw new Error('--manifest is required at least once');
  const images = settings.manifests.map((file) => readImageManifest(file, root));
  const appConfigPath = path.resolve(root, settings.appConfig);
  const before = readFileSync(appConfigPath, 'utf8');
  const appConfig = JSON.parse(before);
  const summary = applyContainerDigests(appConfig, images);
  const after = JSON.stringify(appConfig, null, 2) + '\n';
  const changed = before !== after;
  if (settings.check) {
    if (changed) {
      console.error('[container-manifest] out of sync: run node scripts/update-container-manifest-digest.mjs --manifest <dist/container-image.json>');
      return 1;
    }
    console.log('[container-manifest] up to date for ' + summary.version);
    return 0;
  }
  if (changed) writeFileSync(appConfigPath, after, 'utf8');
  if (settings.json) {
    console.log(JSON.stringify({ ok: true, changed, ...summary }, null, 2));
  } else {
    console.log('[container-manifest] ' + (changed ? 'updated' : 'already current') + ': ' + summary.packageIds.join(', '));
    for (const image of images) console.log('[container-manifest]   ' + image.packageId + ' <- ' + image.locator);
  }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error('[container-manifest] ' + error.message);
    process.exitCode = 1;
  }
}

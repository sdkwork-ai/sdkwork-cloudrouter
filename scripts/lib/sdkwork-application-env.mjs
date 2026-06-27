import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  envFileChanged,
  formatEnvFileContent,
  loadEnvFile,
  mergeEnvRecordPreservingExistingNonEmpty,
} from './merge-env-file.mjs';

/**
 * SDKWork application env profile standard (claw-router implementation).
 *
 * Checked-in templates:  .env.{profile}.example
 * Host profile files:    .env.{profile}
 *
 * Do not use `.local` suffixes. Profile name alone selects the lifecycle file.
 * See specs/application-env-standard.md.
 */

export const CONFIG_PROFILE_ALIASES = Object.freeze({
  dev: 'development',
  development: 'development',
  test: 'test',
  staging: 'staging',
  prod: 'production',
  production: 'production',
  release: 'release',
  postgres: 'postgres',
});

export const RUNTIME_TARGETS = Object.freeze([
  'browser',
  'desktop',
  'server',
  'container',
  'test-runner',
]);

export const FRAMEWORKS = Object.freeze([
  'vite',
  'node',
  'spring',
  'flutter',
  'tauri',
  'generic',
]);

const SPECIAL_PROFILE_FILE_BASENAMES = Object.freeze({
  release: 'release',
  postgres: 'postgres',
});

export function normalizeConfigProfile(configProfile = 'development') {
  const normalized = String(configProfile ?? 'development').trim().toLowerCase();
  return CONFIG_PROFILE_ALIASES[normalized] ?? normalized;
}

export function resolveProfileFileBasename(configProfile = 'development') {
  const normalized = normalizeConfigProfile(configProfile);
  return SPECIAL_PROFILE_FILE_BASENAMES[normalized] ?? normalized;
}

export function resolveCanonicalEnvironment(configProfile = 'development') {
  const normalized = normalizeConfigProfile(configProfile);
  if (normalized === 'release') {
    return 'production';
  }
  return normalized;
}

export function resolveApplicationEnvFileNames(configProfile = 'development') {
  const basename = resolveProfileFileBasename(configProfile);
  return {
    configProfile: normalizeConfigProfile(configProfile),
    profileBasename: basename,
    canonicalEnvironment: resolveCanonicalEnvironment(configProfile),
    exampleFileName: `.env.${basename}.example`,
    profileFileName: `.env.${basename}`,
    genericExampleFileName: '.env.example',
  };
}

export function resolveApplicationEnvRoot({
  workspaceRoot,
  applicationRoot,
  runtimeTarget = 'browser',
} = {}) {
  if (!workspaceRoot) {
    throw new Error('workspaceRoot is required');
  }

  switch (runtimeTarget) {
    case 'browser':
    case 'desktop':
      if (!applicationRoot) {
        throw new Error(`applicationRoot is required for runtime target ${runtimeTarget}`);
      }
      return path.resolve(applicationRoot);
    case 'server':
    case 'container':
    case 'test-runner':
      return path.resolve(workspaceRoot);
    default:
      throw new Error(`unsupported runtime target: ${runtimeTarget}`);
  }
}

export function resolveFrameworkEnvLoadOrder({
  framework = 'vite',
  configProfile = 'development',
} = {}) {
  const { profileFileName } = resolveApplicationEnvFileNames(configProfile);
  switch (framework) {
    case 'vite':
      return Object.freeze(['.env', profileFileName]);
    case 'node':
    case 'spring':
    case 'flutter':
    case 'tauri':
    case 'generic':
      return Object.freeze(['.env', profileFileName]);
    default:
      throw new Error(`unsupported framework: ${framework}`);
  }
}

export function resolveApplicationEnvPaths({
  workspaceRoot,
  applicationRoot,
  configProfile = 'development',
  runtimeTarget = 'browser',
} = {}) {
  const envRoot = resolveApplicationEnvRoot({
    workspaceRoot,
    applicationRoot,
    runtimeTarget,
  });
  const fileNames = resolveApplicationEnvFileNames(configProfile);
  return {
    envRoot,
    runtimeTarget,
    ...fileNames,
    exampleFilePath: path.join(envRoot, fileNames.exampleFileName),
    profileFilePath: path.join(envRoot, fileNames.profileFileName),
    genericExampleFilePath: path.join(envRoot, fileNames.genericExampleFileName),
  };
}

export function loadApplicationEnvExample(configProfile, envPaths) {
  if (existsSync(envPaths.exampleFilePath)) {
    return loadEnvFile(envPaths.exampleFilePath);
  }
  if (existsSync(envPaths.genericExampleFilePath)) {
    return loadEnvFile(envPaths.genericExampleFilePath);
  }
  return {};
}

export function loadApplicationEnvLayers(envPaths, {
  includeProfileFile = true,
} = {}) {
  const layers = [];
  const baseEnvPath = path.join(envPaths.envRoot, '.env');
  if (existsSync(baseEnvPath)) {
    layers.push(loadEnvFile(baseEnvPath));
  }
  if (includeProfileFile && existsSync(envPaths.profileFilePath)) {
    layers.push(loadEnvFile(envPaths.profileFilePath));
  }
  return layers.reduce((merged, layer) => ({ ...merged, ...layer }), {});
}

export function ensureApplicationEnvFile({
  envRoot,
  configProfile = 'development',
  generatedEnv,
  keyOrder = [],
  headerLines = [],
  dryRun = false,
} = {}) {
  if (!envRoot) {
    throw new Error('envRoot is required');
  }
  if (!generatedEnv || typeof generatedEnv !== 'object') {
    throw new Error('generatedEnv is required');
  }

  const envPaths = resolveApplicationEnvPaths({
    workspaceRoot: envRoot,
    applicationRoot: envRoot,
    configProfile,
    runtimeTarget: 'browser',
  });
  envPaths.envRoot = path.resolve(envRoot);

  const existingEnv = loadEnvFile(envPaths.profileFilePath);
  const mergedEnv = mergeEnvRecordPreservingExistingNonEmpty(
    existingEnv,
    generatedEnv,
    keyOrder,
  );
  const changed = envFileChanged(existingEnv, mergedEnv);

  if (!dryRun && changed) {
    mkdirSync(envPaths.envRoot, { recursive: true });
    writeFileSync(
      envPaths.profileFilePath,
      formatEnvFileContent(mergedEnv, {
        headerLines,
        keyOrder,
      }),
      'utf8',
    );
  }

  return {
    ...envPaths,
    mergedEnv,
    changed,
    created: Object.keys(existingEnv).length === 0,
  };
}

export function ensureApplicationEnv({
  workspaceRoot,
  applicationRoot,
  runtimeTarget = 'browser',
  configProfile = 'development',
  generatedEnv,
  exampleEnv = {},
  keyOrder = [],
  headerLines = [],
  dryRun = false,
} = {}) {
  const envPaths = resolveApplicationEnvPaths({
    workspaceRoot,
    applicationRoot,
    configProfile,
    runtimeTarget,
  });
  const templateEnv = {
    ...loadApplicationEnvExample(configProfile, envPaths),
    ...exampleEnv,
  };
  const resolvedGeneratedEnv = mergeEnvRecordPreservingExistingNonEmpty(
    templateEnv,
    generatedEnv ?? {},
    keyOrder,
  );

  return ensureApplicationEnvFile({
    envRoot: envPaths.envRoot,
    configProfile,
    generatedEnv: resolvedGeneratedEnv,
    keyOrder,
    headerLines,
    dryRun,
  });
}

export function readApplicationManifest(workspaceRoot) {
  const manifestPath = path.join(workspaceRoot, 'sdkwork.app.config.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`sdkwork.app.config.json not found at ${manifestPath}`);
  }
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

export function resolveDefaultPcApplicationRoot(workspaceRoot, manifest = readApplicationManifest(workspaceRoot)) {
  const appKey = String(manifest?.app?.key ?? '').trim();
  if (!appKey) {
    throw new Error('sdkwork.app.config.json is missing app.key');
  }
  return path.join(workspaceRoot, 'apps', `${appKey}-pc`);
}

#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS,
  assertEnvTemplateFreeOfForbiddenBrowserProfileKeys,
  findForbiddenEnvKeysInContent,
} from './lib/claw-router-browser-env-contract.mjs';
import { CLAW_ROUTER_RELEASE_ENV_KEY_ORDER } from './dev/claw-router-application-env.mjs';
import {
  CLAW_ROUTER_EDGE_ENV_KEYS,
  CLAW_ROUTER_LEGACY_PRIVATE_EDGE_ENV_PREFIXES,
  CLAW_ROUTER_RELEASE_EDGE_ENV_KEY_ORDER,
  buildReleaseHostEdgeGeneratedEnv,
} from './lib/claw-router-edge-env-contract.mjs';
import { RELEASE_ENVIRONMENT_CONTRACT } from './release-environment-contract.mjs';
import { loadEnvFile } from './lib/merge-env-file.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const PORTAL_ROOT = path.join(WORKSPACE_ROOT, 'apps', 'sdkwork-clawrouter-pc');

const REQUIRED_ENTRYPOINT_MARKERS = Object.freeze([
  {
    label: 'claw-router-dev',
    file: path.join(WORKSPACE_ROOT, 'scripts', 'lib', 'claw-router-dev-main.mjs'),
    markers: ['ensureClawRouterBrowserDevelopmentEnv'],
  },
  {
    label: 'start-workspace',
    file: path.join(WORKSPACE_ROOT, 'scripts', 'dev', 'start-workspace.mjs'),
    markers: ['ensureClawRouterBrowserDevelopmentEnv', 'CLAW_ROUTER_BROWSER_DEV_PROXY_ENV_KEYS', 'buildRuntimeEdgePrivateEnv', 'skipDevEnvFile'],
  },
  {
    label: 'build-claw-router-production',
    file: path.join(WORKSPACE_ROOT, 'scripts', 'build-claw-router-production.mjs'),
    markers: ['ensureClawRouterBrowserProductionEnv'],
  },
  {
    label: 'build-portal',
    file: path.join(PORTAL_ROOT, 'scripts', 'build-portal.mjs'),
    markers: ['ensureClawRouterBrowserProductionEnv'],
  },
  {
    label: 'start-claw-router-production',
    file: path.join(WORKSPACE_ROOT, 'scripts', 'start-claw-router-production.mjs'),
    markers: ['ensureClawRouterEnvForLifecycle', 'buildRuntimeEdgePrivateEnv'],
  },
  {
    label: 'release-environment-contract',
    file: path.join(WORKSPACE_ROOT, 'scripts', 'release-environment-contract.mjs'),
    markers: ['optionalEdgePrivateEnv', 'SDKWORK_CLAW_EDGE_CSP_CONNECT_SRC'],
  },
  {
    label: 'write-release-env',
    file: path.join(WORKSPACE_ROOT, 'scripts', 'write-release-env.mjs'),
    markers: ['buildClawRouterReleaseGeneratedEnv', 'completeReleaseEnvKeyOrder'],
  },
  {
    label: 'portal package predev/prebuild',
    file: path.join(PORTAL_ROOT, 'package.json'),
    markers: ['ensure-claw-router-env.mjs --lifecycle dev', 'ensure-claw-router-env.mjs --lifecycle build'],
  },
]);

const REQUIRED_TEMPLATE_FILES = Object.freeze([
  path.join(PORTAL_ROOT, '.env.example'),
  path.join(PORTAL_ROOT, '.env.development.example'),
  path.join(PORTAL_ROOT, '.env.production.example'),
  path.join(WORKSPACE_ROOT, '.env.release.example'),
]);

const BROWSER_PROFILE_TEMPLATE_FILES = Object.freeze([
  path.join(PORTAL_ROOT, '.env.development.example'),
  path.join(PORTAL_ROOT, '.env.production.example'),
]);

const LEGACY_PRIVATE_EDGE_ENV_PREFIXES = CLAW_ROUTER_LEGACY_PRIVATE_EDGE_ENV_PREFIXES;

const CANONICAL_EDGE_ENV_MARKERS = Object.freeze([
  CLAW_ROUTER_EDGE_ENV_KEYS.cspConnectSrc,
  CLAW_ROUTER_EDGE_ENV_KEYS.toolApiRateLimitRequests,
  CLAW_ROUTER_EDGE_ENV_KEYS.toolApiSdkArchiveRoot,
]);

const RELEASE_PORTAL_PUBLIC_KEYS = Object.freeze([
  'PORTAL_PUBLIC_SDK_BASE_URL',
  'PORTAL_PUBLIC_API_BASE_URL',
  'PORTAL_PUBLIC_APP_API_BASE_URL',
  'PORTAL_PUBLIC_BACKEND_API_BASE_URL',
  'PORTAL_PUBLIC_TOOL_API_ENABLED',
]);

function assertTemplateDocumentsAccessToken(templatePath) {
  const content = readFileSync(templatePath, 'utf8');
  if (!content.includes('SDKWORK_ACCESS_TOKEN')) {
    throw new Error(`${templatePath} must document SDKWORK_ACCESS_TOKEN`);
  }
  if (/SDKWORK_ACCESS_TOKEN=v2\./u.test(content)) {
    throw new Error(`${templatePath} must not contain live SDKWORK_ACCESS_TOKEN values`);
  }
}

function assertViteDevelopmentOnlyBootstrapToken() {
  const viteConfigPath = path.join(PORTAL_ROOT, 'vite.config.ts');
  const source = readFileSync(viteConfigPath, 'utf8');
  if (!source.includes("mode === 'development'")) {
    throw new Error('vite.config.ts must gate SDKWORK_ACCESS_TOKEN define to development mode only');
  }
  if (!source.includes("'process.env.SDKWORK_ACCESS_TOKEN'")) {
    throw new Error('vite.config.ts must define process.env.SDKWORK_ACCESS_TOKEN for development bootstrap');
  }
}

function assertRuntimeEnvScriptDoesNotExposeAccessToken() {
  const viteConfigPath = path.join(PORTAL_ROOT, 'vite.config.ts');
  const source = readFileSync(viteConfigPath, 'utf8');
  const runtimeSection = source.slice(
    source.indexOf('function buildPortalRuntimeEnvScript'),
    source.indexOf('function injectPortalRuntimeEnvScript'),
  );
  if (!runtimeSection.includes("key.startsWith('VITE_')")) {
    throw new Error('buildPortalRuntimeEnvScript must emit only VITE_* browser-safe keys');
  }
  if (/SDKWORK_ACCESS_TOKEN/u.test(runtimeSection)) {
    throw new Error('buildPortalRuntimeEnvScript must not reference SDKWORK_ACCESS_TOKEN');
  }
}

function assertEntrypointMarkers() {
  for (const entry of REQUIRED_ENTRYPOINT_MARKERS) {
    if (!existsSync(entry.file)) {
      throw new Error(`missing required entrypoint file: ${entry.file}`);
    }
    const source = readFileSync(entry.file, 'utf8');
    for (const marker of entry.markers) {
      if (!source.includes(marker)) {
        throw new Error(`${entry.label} must reference ${marker}`);
      }
    }
  }
}

function assertDevelopmentTemplateUsesStandardBrowserEnvKeys() {
  const templatePath = path.join(PORTAL_ROOT, '.env.development.example');
  const content = readFileSync(templatePath, 'utf8');
  assertEnvTemplateFreeOfForbiddenBrowserProfileKeys(content, {
    profileLabel: '.env.development.example',
  });
  if (!content.includes('SDKWORK_CLAW_BROWSER_DEV_PROXY_OPEN_API_ORIGIN')) {
    throw new Error('.env.development.example must document SDKWORK_CLAW_BROWSER_DEV_PROXY_OPEN_API_ORIGIN');
  }
  if (!content.includes('VITE_API_BASE_URL')) {
    throw new Error('.env.development.example must document VITE_API_BASE_URL');
  }
  if (!content.includes('VITE_TOOL_API_ENABLED')) {
    throw new Error('.env.development.example must document VITE_TOOL_API_ENABLED');
  }
}

function assertProductionTemplateForbidsLegacyPortalKeys() {
  const templatePath = path.join(PORTAL_ROOT, '.env.production.example');
  const content = readFileSync(templatePath, 'utf8');
  assertEnvTemplateFreeOfForbiddenBrowserProfileKeys(content, {
    profileLabel: '.env.production.example',
  });
}

function assertReleaseTemplateDocumentsPortalPublicKeys() {
  const templatePath = path.join(WORKSPACE_ROOT, '.env.release.example');
  const content = readFileSync(templatePath, 'utf8');
  for (const key of RELEASE_PORTAL_PUBLIC_KEYS) {
    if (!content.includes(key)) {
      throw new Error(`.env.release.example must document ${key}`);
    }
  }
  for (const key of CLAW_ROUTER_RELEASE_EDGE_ENV_KEY_ORDER) {
    if (!content.includes(key)) {
      throw new Error(`.env.release.example must document private edge key ${key}`);
    }
  }
  const forbiddenAssignments = findForbiddenEnvKeysInContent(content, {
    forbiddenPrefixes: LEGACY_PRIVATE_EDGE_ENV_PREFIXES,
  });
  if (forbiddenAssignments.length > 0) {
    const sample = forbiddenAssignments.map((entry) => `${entry.key} (line ${entry.line})`).join(', ');
    throw new Error(`.env.release.example must not assign legacy private edge keys: ${sample}`);
  }
}

function assertEnvExampleIsReleaseRuntimeReference() {
  const templatePath = path.join(PORTAL_ROOT, '.env.example');
  const content = readFileSync(templatePath, 'utf8');
  if (!content.includes('PORTAL_PUBLIC_SDK_BASE_URL')) {
    throw new Error('.env.example must document release-host PORTAL_PUBLIC_* runtime keys');
  }
  for (const key of CANONICAL_EDGE_ENV_MARKERS) {
    if (!content.includes(key)) {
      throw new Error(`.env.example must document private edge key ${key}`);
    }
  }
  const forbiddenAssignments = findForbiddenEnvKeysInContent(content, {
    forbiddenPrefixes: ['PORTAL_DEV_PROXY_', 'PORTAL_FORWARD_', ...LEGACY_PRIVATE_EDGE_ENV_PREFIXES],
  });
  if (forbiddenAssignments.length > 0) {
    const sample = forbiddenAssignments.map((entry) => `${entry.key} (line ${entry.line})`).join(', ');
    throw new Error(`.env.example must not assign legacy PORTAL_* private edge keys: ${sample}`);
  }
}

function assertReleaseEdgeGeneratedEnvMatchesKeyOrder() {
  const generated = buildReleaseHostEdgeGeneratedEnv({});
  for (const key of CLAW_ROUTER_RELEASE_EDGE_ENV_KEY_ORDER) {
    if (!Object.prototype.hasOwnProperty.call(generated, key)) {
      throw new Error(`buildReleaseHostEdgeGeneratedEnv must emit ${key}`);
    }
  }
}

function assertReleaseEnvironmentContractMatchesEdgeKeyOrder() {
  if (RELEASE_ENVIRONMENT_CONTRACT.version !== 4) {
    throw new Error('release-environment-contract.mjs must stay on version 4 for edge private env alignment');
  }
  for (const key of CLAW_ROUTER_RELEASE_EDGE_ENV_KEY_ORDER) {
    if (!RELEASE_ENVIRONMENT_CONTRACT.optionalEdgePrivateEnv.includes(key)) {
      throw new Error(`release-environment-contract optionalEdgePrivateEnv must include ${key}`);
    }
  }
}

function assertGatewayReadsCanonicalEdgeEnvKeys() {
  const gatewayMainPath = path.join(
    WORKSPACE_ROOT,
    'crates',
    'sdkwork-clawrouter-standalone-gateway-lib',
    'src',
    'main.rs',
  );
  const edgeEnvPath = path.join(
    WORKSPACE_ROOT,
    'crates',
    'sdkwork-clawrouter-standalone-gateway-lib',
    'src',
    'edge_env.rs',
  );
  const mainSource = readFileSync(gatewayMainPath, 'utf8');
  const edgeEnvSource = readFileSync(edgeEnvPath, 'utf8');
  for (const key of CANONICAL_EDGE_ENV_MARKERS) {
    if (!mainSource.includes(key)) {
      throw new Error(`gateway main.rs must read canonical edge env key ${key}`);
    }
  }
  if (!edgeEnvSource.includes('env_optional_with_legacy')) {
    throw new Error('gateway edge_env.rs must provide legacy alias resolution');
  }
}

function assertViteReadsStandardBrowserDevProxyKeys() {
  const viteConfigPath = path.join(PORTAL_ROOT, 'vite.config.ts');
  const source = readFileSync(viteConfigPath, 'utf8');
  if (!source.includes('SDKWORK_CLAW_BROWSER_DEV_PROXY_OPEN_API_ORIGIN')) {
    throw new Error('vite.config.ts must read SDKWORK_CLAW_BROWSER_DEV_PROXY_OPEN_API_ORIGIN');
  }
  if (/PORTAL_DEV_PROXY_/u.test(source)) {
    throw new Error('vite.config.ts must not reference legacy PORTAL_DEV_PROXY_* keys');
  }
}

function assertHostReleaseProfileFreeOfLegacyEdgeKeys() {
  const profileFilePath = path.join(WORKSPACE_ROOT, '.env.release');
  if (!existsSync(profileFilePath)) {
    return;
  }
  const content = readFileSync(profileFilePath, 'utf8');
  const forbidden = findForbiddenEnvKeysInContent(content, {
    forbiddenPrefixes: LEGACY_PRIVATE_EDGE_ENV_PREFIXES,
  });
  if (forbidden.length > 0) {
    const sample = forbidden.slice(0, 5).map((entry) => `${entry.key} (line ${entry.line})`).join(', ');
    throw new Error(
      `.env.release contains legacy private edge keys; run `
      + 'node scripts/ensure-claw-router-env.mjs --lifecycle start: '
      + sample,
    );
  }
}

function assertHostReleaseProfileHasCanonicalKeyOrder() {
  const profileFilePath = path.join(WORKSPACE_ROOT, '.env.release');
  if (!existsSync(profileFilePath)) {
    return;
  }
  const record = loadEnvFile(profileFilePath);
  const missing = CLAW_ROUTER_RELEASE_ENV_KEY_ORDER.filter(
    (key) => !Object.prototype.hasOwnProperty.call(record, key),
  );
  if (missing.length > 0) {
    throw new Error(
      `.env.release is missing canonical keys; run `
      + 'node scripts/ensure-claw-router-env.mjs --lifecycle all: '
      + missing.join(', '),
    );
  }
}

function assertHostBrowserProfilesFreeOfLegacyPortalKeys() {
  for (const profileFileName of ['.env.development', '.env.production']) {
    const profileFilePath = path.join(PORTAL_ROOT, profileFileName);
    if (!existsSync(profileFilePath)) {
      continue;
    }
    const content = readFileSync(profileFilePath, 'utf8');
    const forbidden = findForbiddenEnvKeysInContent(content);
    if (forbidden.length > 0) {
      const sample = forbidden.slice(0, 5).map((entry) => `${entry.key} (line ${entry.line})`).join(', ');
      throw new Error(
        `${profileFileName} contains legacy PORTAL_* keys; run `
        + `node scripts/ensure-claw-router-env.mjs --lifecycle ${profileFileName === '.env.development' ? 'dev' : 'build'}: ${sample}`,
      );
    }
  }
}

function assertBrowserProfileTemplatesDoNotUseLegacyPortalKeys() {
  for (const templatePath of BROWSER_PROFILE_TEMPLATE_FILES) {
    const content = readFileSync(templatePath, 'utf8');
    assertEnvTemplateFreeOfForbiddenBrowserProfileKeys(content, {
      profileLabel: path.basename(templatePath),
    });
  }
}

function main() {
  const issues = [];
  for (const templatePath of REQUIRED_TEMPLATE_FILES) {
    if (!existsSync(templatePath)) {
      issues.push(`missing template file: ${templatePath}`);
      continue;
    }
    try {
      assertTemplateDocumentsAccessToken(templatePath);
    } catch (error) {
      issues.push(error instanceof Error ? error.message : String(error));
    }
  }

  for (const assertion of [
    assertViteDevelopmentOnlyBootstrapToken,
    assertRuntimeEnvScriptDoesNotExposeAccessToken,
    assertDevelopmentTemplateUsesStandardBrowserEnvKeys,
    assertProductionTemplateForbidsLegacyPortalKeys,
    assertReleaseTemplateDocumentsPortalPublicKeys,
    assertEnvExampleIsReleaseRuntimeReference,
    assertGatewayReadsCanonicalEdgeEnvKeys,
    assertReleaseEdgeGeneratedEnvMatchesKeyOrder,
    assertReleaseEnvironmentContractMatchesEdgeKeyOrder,
    assertBrowserProfileTemplatesDoNotUseLegacyPortalKeys,
    assertViteReadsStandardBrowserDevProxyKeys,
    assertHostReleaseProfileFreeOfLegacyEdgeKeys,
    assertHostReleaseProfileHasCanonicalKeyOrder,
    assertHostBrowserProfilesFreeOfLegacyPortalKeys,
    assertEntrypointMarkers,
  ]) {
    try {
      assertion();
    } catch (error) {
      issues.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (issues.length > 0) {
    console.error('[check-claw-router-application-env] alignment failures:');
    for (const issue of issues) {
      console.error(`  - ${issue}`);
    }
    process.exit(1);
  }

  console.log('[check-claw-router-application-env] application env alignment ok');
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}

export {
  REQUIRED_ENTRYPOINT_MARKERS,
  REQUIRED_TEMPLATE_FILES,
  assertBrowserProfileTemplatesDoNotUseLegacyPortalKeys,
  assertDevelopmentTemplateUsesStandardBrowserEnvKeys,
  assertEntrypointMarkers,
  assertEnvExampleIsReleaseRuntimeReference,
  assertGatewayReadsCanonicalEdgeEnvKeys,
  assertHostReleaseProfileHasCanonicalKeyOrder,
  assertHostBrowserProfilesFreeOfLegacyPortalKeys,
  assertProductionTemplateForbidsLegacyPortalKeys,
  assertReleaseTemplateDocumentsPortalPublicKeys,
  assertReleaseEnvironmentContractMatchesEdgeKeyOrder,
  assertRuntimeEnvScriptDoesNotExposeAccessToken,
  assertTemplateDocumentsAccessToken,
  assertViteDevelopmentOnlyBootstrapToken,
  assertViteReadsStandardBrowserDevProxyKeys,
  main,
};

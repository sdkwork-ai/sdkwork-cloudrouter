/**
 * Store submission plans for the Flutter mobile app.
 *
 * A market document declares one or more submission targets (Apple: iOS; Google
 * Play: Android; AppGallery: Android *and* HarmonyOS). Each target becomes its
 * own plan so an unavailable HarmonyOS package never blocks the AppGallery
 * Android submission, and vice versa.
 *
 * A plan turns one target into the provider-specific request a credentialed
 * runner would send: endpoint, method, body, credential *references*, the local
 * artifact it consumes, and the external steps that no API can perform (creating
 * the app record in the provider console). The planner never reads or emits a
 * secret value.
 */
import fs from 'node:fs';
import path from 'node:path';

import { loadStoreConfigs, loadStoreProfiles, resolveSpecsRoot } from './store-publishing-lib.mjs';

export const ARTIFACT_EXTENSION_BY_FORMAT = {
  AAB: '.aab',
  APK: '.apk',
  IPA: '.ipa',
  HAP: '.hap',
};

/**
 * Builds one plan per market target.
 *
 * @param {object} input
 * @param {string} input.appRoot
 * @param {object} input.manifest parsed agent.app.config.json
 * @param {string} input.artifactsDir directory holding built artifacts
 * @returns {{plans: object[], issues: string[]}}
 */
export function buildStoreSubmissionPlans({ appRoot, manifest, artifactsDir }) {
  const specsRoot = resolveSpecsRoot(appRoot);
  const profiles = loadStoreProfiles(specsRoot);
  const configs = new Map(
    loadStoreConfigs(appRoot).map((entry) => [entry.config.marketId, { ...entry }]),
  );
  const artifacts = discoverArtifacts(artifactsDir);
  const plans = [];
  const issues = [];

  for (const lane of manifest.publish?.stores ?? []) {
    const configEntry = configs.get(lane.marketId);
    if (!configEntry) {
      issues.push(`${lane.marketId}: publish.stores has no etc/store-publishing document`);
      continue;
    }
    const { config, relativeFile } = configEntry;
    if (!profiles[lane.marketId]) {
      issues.push(`${lane.marketId}: no store media profile`);
    }
    const targets = submissionTargets(config);
    if (targets.length === 0) {
      issues.push(`${lane.marketId}: submission.targets is empty`);
      continue;
    }
    for (const target of targets) {
      const artifact = matchArtifact(target, artifacts);
      if (!artifact) {
        issues.push(`${lane.marketId}/${target.id ?? target.platform}: no built ${target.packageFormat} artifact found`);
      }
      plans.push(
        planForTarget({
          config,
          configRef: relativeFile,
          lane,
          target,
          artifact,
          version: manifest.release?.currentVersion ?? '0.0.0',
        }),
      );
    }
  }
  return { plans, issues };
}

/** Normalizes the market document's submission targets. */
export function submissionTargets(config) {
  const submission = config?.submission ?? {};
  if (Array.isArray(submission.targets)) {
    return submission.targets;
  }
  if (Array.isArray(submission.artifacts)) {
    return submission.artifacts;
  }
  return submission.artifact ? [submission.artifact] : [];
}

function matchArtifact(target, artifacts) {
  return artifacts.find((candidate) => candidate.name === target.artifactName)
    ?? artifacts.find((candidate) => candidate.format === target.packageFormat)
    ?? artifacts.find((candidate) => candidate.path.endsWith(ARTIFACT_EXTENSION_BY_FORMAT[target.packageFormat] ?? ''));
}

function planForTarget({ config, configRef, lane, target, artifact, version }) {
  const credentials = Object.values(config.submission?.credentialRefs ?? {});
  const base = {
    marketId: config.marketId,
    targetId: target.id ?? target.platform,
    platform: target.platform,
    packageFormat: target.packageFormat,
    displayName: config.displayName ?? config.marketId,
    configRef,
    version,
    track: config.release?.track,
    countries: config.release?.countries ?? [],
    rolloutPercent: config.release?.rolloutPercent,
    credentials,
    artifacts: artifact ? [artifact.name] : [],
    storeUrl: lane.storeUrl,
  };
  const externalSteps = externalStepsFor(config);
  switch (config.marketId) {
    case 'APPLE_APP_STORE': {
      const appleId = config.identifiers?.appleId;
      return {
        ...base,
        provider: 'app-store-connect',
        method: 'POST',
        endpoint: appleId
          ? `https://api.appstoreconnect.apple.com/v1/apps/${appleId}/appStoreVersions`
          : 'https://api.appstoreconnect.apple.com/v1/appStoreVersions',
        headers: { 'Content-Type': 'application/json' },
        body: {
          data: {
            type: 'appStoreVersions',
            attributes: {
              platform: 'IOS',
              versionString: version,
              releaseType: config.release?.releaseType ?? 'MANUAL',
            },
          },
        },
        assets: artifact ? [{ name: artifact.name, purpose: 'app-store-build' }] : [],
        externalSteps,
      };
    }
    case 'GOOGLE_PLAY': {
      const applicationId = config.identifiers?.applicationId;
      return {
        ...base,
        provider: 'google-play-developer-api',
        method: 'POST',
        endpoint: `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${applicationId}/edits`,
        headers: { 'Content-Type': 'application/json' },
        body: {
          track: config.release?.track,
          releaseStatus: config.release?.releaseType === 'STAGED_ROLLOUT' ? 'inProgress' : 'completed',
          userFraction: config.release?.phasedRelease ? (config.release?.rolloutPercent ?? 100) / 100 : undefined,
          countries: config.release?.countries ?? [],
        },
        assets: artifact ? [{ name: artifact.name, purpose: 'bundle-upload' }] : [],
        externalSteps,
      };
    }
    case 'HUAWEI_APPGALLERY': {
      const appId = config.identifiers?.appId;
      return {
        ...base,
        provider: 'appgallery-connect-api',
        method: 'POST',
        endpoint: 'https://connect-api.cloud.huawei.com/api/publish/v2/app-file-upload',
        headers: { 'Content-Type': 'application/json' },
        body: {
          appId: appId ?? null,
          packageType: target.packageFormat === 'HAP' ? 'HARMONY' : 'ANDROID',
          track: config.release?.track,
          releaseType: config.release?.releaseType,
          countries: config.release?.countries ?? [],
        },
        assets: artifact
          ? [{
            name: artifact.name,
            purpose: target.packageFormat === 'HAP' ? 'harmony-package' : 'android-package',
          }]
          : [],
        externalSteps,
      };
    }
    default:
      return {
        ...base,
        provider: 'unknown',
        method: 'POST',
        endpoint: '',
        headers: {},
        body: {},
        assets: [],
        externalSteps: [`No submission adapter for ${config.marketId}`],
      };
  }
}

function externalStepsFor(config) {
  if (config.marketId === 'APPLE_APP_STORE' && !config.identifiers?.appleId) {
    return ['Create the app record once in App Store Connect, then store its numeric id as identifiers.appleId'];
  }
  if (config.marketId === 'HUAWEI_APPGALLERY' && !config.identifiers?.appId) {
    return ['Create the AppGallery Connect app once, then store its numeric id as identifiers.appId'];
  }
  return [];
}

/** Finds build artifacts by extension in a directory tree (bounded depth). */
export function discoverArtifacts(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }
  const found = [];
  const walk = (directory, depth) => {
    if (depth > 4) {
      return;
    }
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
        continue;
      }
      for (const [format, extension] of Object.entries(ARTIFACT_EXTENSION_BY_FORMAT)) {
        if (entry.name.endsWith(extension)) {
          found.push({
            name: entry.name,
            format,
            path: full,
            fileSizeBytes: fs.statSync(full).size,
          });
          break;
        }
      }
    }
  };
  walk(rootDir, 0);
  return found;
}

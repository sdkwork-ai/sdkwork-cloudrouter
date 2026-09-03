import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = (relativePath) => JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8'));
const readText = (relativePath) => readFileSync(path.join(repoRoot, relativePath), 'utf8');

const deployment = readJson('etc/sdkwork.deployment.config.json');
const topology = readJson('specs/topology.spec.json');
const deployManifest = readText('deployments/deploy.yaml');

// ADR-20260810-multi-base-domain-production-binding matrix:
// router-<suffix>.<base-domain> for every registered base domain;
// production carries no suffix. cloudrouter.* is a transition alias.
const expectedOrigins = {
  development: 'http://router-dev.sdkwork.com:3905/',
  test: 'https://router-test.sdkwork.com/',
  staging: 'https://router-staging.sdkwork.com/',
  production: 'https://router.sdkwork.com/',
};
const expectedCloudApiBaseUrls = {
  development: 'https://api-dev.sdkwork.com/',
  test: 'https://api-test.sdkwork.com/',
  staging: 'https://api-staging.sdkwork.com/',
  production: 'https://api.sdkwork.com/',
};
// Topology cloudPublicHosts application.public-ingress spot checks.

for (const [environment, expectedOrigin] of Object.entries(expectedOrigins)) {
  const canonical = deployment.environments?.[environment];
  assert.ok(canonical, `deployment config must declare ${environment}`);
  assert.equal(canonical.applicationOrigin, expectedOrigin);

  const parsed = new URL(expectedOrigin);
  assert.equal(parsed.pathname, '/', `${environment} must be served at the origin root`);
  assert.doesNotMatch(parsed.hostname, /^api(?:-|\.)/u);
  // cloudApiBaseUrl declares the full registered api-<suffix>.<base-domain>
  // family (';'-joined, ENVIRONMENT_SPEC §5.1.0.1); the canonical sdkwork.com
  // origin must be a member of that family.
  const cloudApiOriginFamily = String(canonical.cloudApiBaseUrl)
    .split(';')
    .map((origin) => origin.trim().replace(/\/+$/u, ''));
  assert.ok(
    cloudApiOriginFamily.includes(expectedCloudApiBaseUrls[environment].replace(/\/+$/u, '')),
    `${environment} cloudApiBaseUrl must register ${expectedCloudApiBaseUrls[environment]}`,
  );
}

const publicHosts = topology.cloudPublicHosts?.['application.public-ingress'];
assert.ok(publicHosts, 'topology must register application.public-ingress cloud public hosts');
assert.equal(publicHosts.httpHost, 'router.sdkwork.com');
assert.deepEqual(publicHosts.httpHosts?.slice(0, 3), [
  'router.sdkwork.com',
  'router.birdcoder.com',
  'router.dtupay.com',
]);

for (const deploymentProfile of ['cloud', 'standalone']) {
  for (const environment of Object.keys(expectedOrigins)) {
    const profileSource = readText(`etc/topology/${deploymentProfile}.${environment}.env`);
    assert.match(profileSource, new RegExp(`SDKWORK_CLOUDROUTER_ROUTER_DEPLOYMENT_PROFILE=${deploymentProfile}`, 'u'));
    assert.match(profileSource, new RegExp(`SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT=${environment}`, 'u'));

    if (deploymentProfile === 'cloud') {
      const origin = expectedOrigins[environment].replace(/\/$/u, '');
      const apiBaseUrl = expectedCloudApiBaseUrls[environment].replace(/\/$/u, '');
      for (const key of ['APPLICATION_PUBLIC_HTTP_URL', 'APPLICATION_OPEN_HTTP_URL', 'APPLICATION_BACKEND_HTTP_URL']) {
        assert.ok(
          profileSource.includes(`SDKWORK_CLOUDROUTER_ROUTER_${key}=${origin}`),
          `cloud env ${key} must be ${origin}`,
        );
        assert.ok(
          profileSource.includes(`VITE_SDKWORK_CLOUDROUTER_ROUTER_${key}=${origin}`),
          `cloud env VITE ${key} must be ${origin}`,
        );
      }
      assert.ok(
        profileSource.includes(`SDKWORK_CLOUDROUTER_ROUTER_PLATFORM_API_GATEWAY_HTTP_URL=${apiBaseUrl}`),
      );
      assert.ok(
        profileSource.includes(`VITE_SDKWORK_CLOUDROUTER_ROUTER_PLATFORM_API_GATEWAY_HTTP_URL=${apiBaseUrl}`),
      );
    } else {
      // Standalone profiles fold to loopback URLs; they must not reference
      // any *.sdkwork.com cloud hostname.
      assert.doesNotMatch(profileSource, /\.sdkwork\.com/u, `standalone ${environment} must not reference cloud hostnames`);
      assert.match(profileSource, /127\.0\.0\.1/u, `standalone ${environment} must fold to loopback URLs`);
    }
  }
}

// Retired vocabulary must not appear anywhere in source config.
const topologyDirFiles = ['cloud.development.env', 'cloud.test.env', 'cloud.staging.env', 'cloud.production.env',
  'standalone.development.env', 'standalone.test.env', 'standalone.staging.env', 'standalone.production.env']
  .map((name) => readText(`etc/topology/${name}`));
const workspaceConfigText = [
  ...topologyDirFiles,
  readText('etc/sdkwork.deployment.config.json'),
  readText('specs/topology.spec.json'),
  readText('deployments/deploy.yaml'),
].join('\n');
assert.doesNotMatch(workspaceConfigText, /testapi\.sdkwork\.com/u, 'testapi.sdkwork.com is retired');

// deploy.yaml cloud expose domain + aliases must all belong to a host family
// registered in the topology cloudPublicHosts registry (any surface, any
// environment; ADR-20260810-multi-base-domain-production-binding).
// (standalone.production uses an internal customer domain and is exempt.)
const registeredHostSets = new Set(
  Object.values(topology.cloudPublicHosts ?? {})
    .flatMap((entry) => [
      ...(Array.isArray(entry.httpHosts) ? entry.httpHosts : []),
      ...Object.values(entry.environments ?? {}).flatMap(
        (envEntry) => (Array.isArray(envEntry?.httpHosts) ? envEntry.httpHosts : []),
      ),
    ])
    .map((host) => String(host).trim())
    .filter(Boolean),
);
const cloudSection = deployManifest.split('standalone.production:')[0] ?? deployManifest;
// Each expose block starts at `      - domain:`; split on the domain markers so
// alias extraction can never bleed into the next block.
const exposeChunks = cloudSection.split(/\n(?=\s*- domain:\s)/u).slice(1);
assert.ok(exposeChunks.length >= 3, 'deploy.yaml must declare cloud test/staging/production exposes');
for (const chunk of exposeChunks) {
  const domain = chunk.match(/^\s*- domain:\s*([^\s]+)/u)?.[1];
  assert.ok(domain, 'expose block must declare a domain');
  assert.ok(registeredHostSets.has(domain), `expose domain ${domain} must be registered in cloudPublicHosts`);
  const aliasBlock = chunk.match(/aliases:\s*\n((?:\s+- [^\n]+\n?)*)/u)?.[1] ?? '';
  for (const aliasLine of aliasBlock.matchAll(/^\s+- ([^\n]+)$/gmu)) {
    const alias = aliasLine[1].trim();
    assert.ok(registeredHostSets.has(alias), `expose alias ${alias} must be registered in cloudPublicHosts`);
  }
}

console.log('sdkwork-cloudrouter web domain routing standard passed');

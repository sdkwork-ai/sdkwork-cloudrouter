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
// Topology cloudPublicHosts application.public-ingress host sets per environment.
const expectedHostSets = {
  development: ['router-dev.sdkwork.com', 'router-dev.birdcoder.com', 'router-dev.dtupay.com', 'cloudrouter-dev.sdkwork.com'],
  test: ['router-test.sdkwork.com', 'router-test.birdcoder.com', 'router-test.dtupay.com', 'cloudrouter-test.sdkwork.com'],
  staging: ['router-staging.sdkwork.com', 'router-staging.birdcoder.com', 'router-staging.dtupay.com', 'cloudrouter-staging.sdkwork.com'],
  production: ['router.sdkwork.com', 'router.birdcoder.com', 'router.dtupay.com', 'cloudrouter.sdkwork.com'],
};

for (const [environment, expectedOrigin] of Object.entries(expectedOrigins)) {
  const canonical = deployment.environments?.[environment];
  assert.ok(canonical, `deployment config must declare ${environment}`);
  assert.equal(canonical.applicationOrigin, expectedOrigin);

  const parsed = new URL(expectedOrigin);
  assert.equal(parsed.pathname, '/', `${environment} must be served at the origin root`);
  assert.doesNotMatch(parsed.hostname, /^api(?:-|\.)/u);
  assert.equal(canonical.cloudApiBaseUrl, expectedCloudApiBaseUrls[environment]);
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

// deploy.yaml cloud expose domain + aliases must all belong to the registered host set.
// (standalone.production uses an internal customer domain and is exempt.)
const cloudSection = deployManifest.split('standalone.production:')[0] ?? deployManifest;
const hostSets = new Set(Object.values(expectedHostSets).flat());
const exposeBlocks = [...cloudSection.matchAll(/domain:\s*([^\s]+)[\s\S]*?(?=\n\s{4}- domain:|\n\s{2}cloud\.|\n\s{2}standalone\.|$)/gu)];
assert.ok(exposeBlocks.length >= 3, 'deploy.yaml must declare cloud test/staging/production exposes');
for (const block of exposeBlocks) {
  const domain = block[1];
  assert.ok(hostSets.has(domain), `expose domain ${domain} must be registered in cloudPublicHosts`);
  for (const aliasMatch of block[0].matchAll(/aliases:\s*\n((?:\s+- [^\n]+\n?)+)/gu)) {
    for (const aliasLine of aliasMatch[1].matchAll(/^\s+- ([^\n]+)$/gmu)) {
      const alias = aliasLine[1].trim();
      assert.ok(hostSets.has(alias), `expose alias ${alias} must be registered in cloudPublicHosts`);
    }
  }
}

console.log('sdkwork-cloudrouter web domain routing standard passed');

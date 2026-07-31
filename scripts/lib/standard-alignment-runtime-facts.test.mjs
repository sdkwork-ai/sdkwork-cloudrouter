import assert from 'node:assert/strict';
import test from 'node:test';

import {
  analyzeClientLocalSqliteRuntime,
  analyzeRedisHaManifest,
} from './standard-alignment-runtime-facts.mjs';

test('Redis HA requires real replicas, writable-primary discovery, and consistent TLS', () => {
  const facts = analyzeRedisHaManifest(`
kind: Secret
stringData:
  redis-password: secret
  redis-url: "rediss://redis:6379/0"
---
kind: StatefulSet
spec:
  replicas: 3
  template:
    spec:
      affinity:
        podAntiAffinity: {}
      containers:
        - name: sentinel
          args: ["sentinel.conf", "sentinel monitor mymaster redis-0 6379 2", "sentinel auth-pass mymaster secret"]
---
kind: PodDisruptionBudget
spec:
  minAvailable: 2
`);

  assert.equal(facts.hasReplicaConfiguration, false);
  assert.equal(facts.hasWritablePrimaryDiscovery, false);
  assert.equal(facts.tlsTransportConsistent, false);
  assert.equal(facts.isHa, false);
});

test('Redis HA accepts a replicated Sentinel topology with runtime discovery', () => {
  const facts = analyzeRedisHaManifest(`
kind: Secret
stringData:
  redis-password: secret
  redis-url: "rediss://sentinel:26379/0"
---
kind: StatefulSet
spec:
  replicas: 3
  template:
    spec:
      affinity:
        podAntiAffinity: {}
      containers:
        - name: redis
          args: ["--replicaof", "redis-0", "6379", "--tls-port", "6379", "--tls-cert-file", "/tls/tls.crt", "--tls-key-file", "/tls/tls.key"]
        - name: sentinel
          args: ["sentinel.conf", "sentinel monitor mymaster redis-0 6379 2", "sentinel auth-pass mymaster secret"]
---
kind: PodDisruptionBudget
spec:
  minAvailable: 2
`, { runtimeSources: 'redis::sentinel::SentinelClient' });

  assert.equal(facts.hasReplicaConfiguration, true);
  assert.equal(facts.hasWritablePrimaryDiscovery, true);
  assert.equal(facts.tlsTransportConsistent, true);
  assert.equal(facts.isHa, true);
});

test('SQLite fixtures do not establish a client-local desktop runtime', () => {
  const facts = analyzeClientLocalSqliteRuntime({
    appConfig: { runtime: { runtimes: ['WEB', 'TAURI'] } },
    packageJson: {
      scripts: {
        'dev:desktop:sqlite': 'node dev.mjs --target desktop --database sqlite',
      },
    },
    applicationLauncherSource: `case 'desktop':
      launch({ clientOnly: true });
    case 'service':`,
    serverRuntimeSources: 'Claw Router server runtime requires PostgreSQL; SQLite is client-local only',
  });

  assert.equal(facts.desktopLaunchIsClientOnly, true);
  assert.equal(facts.hasNativeDesktopHost, false);
  assert.equal(facts.hasClientLocalSqliteAuthority, false);
  assert.equal(facts.isImplemented, false);
});

test('SQLite is implemented only by a separate native client-local authority', () => {
  const facts = analyzeClientLocalSqliteRuntime({
    appConfig: { runtime: { runtimes: ['WEB', 'TAURI'] } },
    packageJson: {
      scripts: {
        'dev:desktop:sqlite': 'node dev.mjs --target desktop --database sqlite',
      },
    },
    applicationLauncherSource: `case 'desktop':
      launchNativeDesktop();
    case 'service':`,
    tauriConfigPaths: ['apps/desktop/src-tauri/tauri.conf.json'],
    clientLocalSqliteAuthorityPaths: ['apps/desktop/src-tauri/migrations/0001_client_local.sql'],
    serverRuntimeSources: 'Claw Router server runtime requires PostgreSQL; SQLite is client-local only',
  });

  assert.equal(facts.desktopLaunchIsClientOnly, false);
  assert.equal(facts.hasNativeDesktopHost, true);
  assert.equal(facts.hasClientLocalSqliteAuthority, true);
  assert.equal(facts.isImplemented, true);
});

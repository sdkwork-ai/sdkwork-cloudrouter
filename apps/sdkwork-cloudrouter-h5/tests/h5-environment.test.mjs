import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The specs authority for Vite mode parsing (`ENVIRONMENT_SPEC.md` §5.1.0.2).
 * It is a Vite-config-time Node library, so browser source cannot import it —
 * this suite is what keeps `src/bootstrap/environment.ts` in lockstep with it.
 */
const AUTHORITY = await import(
  pathToFileURL(path.resolve(ROOT, '../../../sdkwork-specs/tools/vite-runtime-profile.mjs')).href
);

const ENVIRONMENT_SOURCE = fs.readFileSync(
  path.join(ROOT, 'src/bootstrap/environment.ts'),
  'utf8',
);

/** Extracts a frozen string-literal array declaration from the TS source. */
function readFrozenArray(source, constantName) {
  const match = new RegExp(
    `export const ${constantName}[^=]*=\\s*Object\\.freeze\\(\\[([^\\]]*)\\]\\)`,
    'u',
  ).exec(source);
  assert.ok(match, `${constantName} must be declared as Object.freeze([...])`);
  return [...match[1].matchAll(/'([^']+)'/gu)].map((entry) => entry[1]);
}

/**
 * `import.meta.env.MODE` is always the profile id the build selected
 * (`build-browser-client.mjs` L383: `vite --mode <deploymentProfile>.<environment>`).
 * This is the exact object Vite substitutes for a production build.
 */
function viteBuildEnv(mode) {
  return { BASE_URL: '/', DEV: false, MODE: mode, PROD: true, SSR: false };
}

const PROFILE_IDS = ['standalone', 'cloud'].flatMap((deploymentProfile) => (
  ['development', 'test', 'staging', 'demo', 'production']
    .map((environment) => `${deploymentProfile}.${environment}`)
));

describe('cloudrouter h5 environment parity with the specs authority', () => {
  it('declares the lifecycle vocabulary the specs authority declares', () => {
    assert.deepEqual(
      readFrozenArray(ENVIRONMENT_SOURCE, 'CLOUDROUTER_H5_LIFECYCLE_ENVIRONMENTS'),
      [...AUTHORITY.LIFECYCLE_ENVIRONMENTS],
    );
  });

  it('declares the deployment profiles the specs authority declares', () => {
    assert.deepEqual(
      readFrozenArray(ENVIRONMENT_SOURCE, 'CLOUDROUTER_H5_DEPLOYMENT_PROFILES'),
      [...AUTHORITY.DEPLOYMENT_PROFILES],
    );
  });

  it('keeps the profile-id pattern identical to the specs authority', () => {
    const match = /const PROFILE_ID_PATTERN\s*=\s*\/(.+)\/[a-z]*;/u.exec(ENVIRONMENT_SOURCE);
    assert.ok(match, 'environment.ts must declare PROFILE_ID_PATTERN');
    assert.equal(match[1], AUTHORITY.PROFILE_ID_PATTERN.source);
  });

  it('never quotes only a subset of the lifecycle vocabulary', () => {
    // `demo` was historically missing, which silently routed `cloud.demo`
    // builds into the production bundle.
    assert.ok(AUTHORITY.LIFECYCLE_ENVIRONMENTS.includes('demo'));
    assert.ok(readFrozenArray(ENVIRONMENT_SOURCE, 'CLOUDROUTER_H5_LIFECYCLE_ENVIRONMENTS').includes('demo'));
  });
});

/**
 * Behavioural coverage. Importing TypeScript source from a `.mjs` test relies on
 * Node's native type stripping (Node ≥ 22.18). The vocabulary/pattern assertions
 * above stay unconditional, so the drift guard holds even where this cannot run.
 */
let environmentModule = null;
let importError = null;
try {
  environmentModule = await import(
    pathToFileURL(path.join(ROOT, 'src/bootstrap/environment.ts')).href
  );
} catch (error) {
  importError = error;
}

describe('cloudrouter h5 environment resolution', { skip: importError !== null }, () => {
  if (importError === null) {
    it('resolves every deployment profile onto the specs authority profile', () => {
      for (const profileId of PROFILE_IDS) {
        const authority = AUTHORITY.resolveViteRuntimeProfile(profileId);
        const resolved = environmentModule.createHostEnvironment(viteBuildEnv(profileId), 'https://example.test');
        assert.equal(resolved.lifecycleEnvironment, authority.environment, profileId);
        assert.equal(resolved.deploymentProfile, authority.deploymentProfile, profileId);
        assert.equal(resolved.profileId, authority.profileId, profileId);
      }
    });

    it('accepts the canonical build mode instead of throwing before first render', () => {
      // Regression: `build-browser-client.mjs --environment dev` produces
      // MODE=standalone.development. A bare-name lifecycle parser threw here and
      // `main.tsx` swallowed the rejection, rendering an empty #root.
      const resolved = environmentModule.createHostEnvironment(
        viteBuildEnv('standalone.development'),
        'https://example.test',
      );
      assert.equal(resolved.lifecycleEnvironment, 'development');
      assert.equal(resolved.deploymentProfile, 'standalone');
      assert.equal(resolved.profileId, 'standalone.development');
      assert.equal(resolved.appApiBaseUrl, 'https://example.test');
    });

    it('accepts the demo lifecycle environment from a cloud build', () => {
      const resolved = environmentModule.createHostEnvironment(
        viteBuildEnv('cloud.demo'),
        'https://example.test',
      );
      assert.equal(resolved.lifecycleEnvironment, 'demo');
      assert.equal(resolved.deploymentProfile, 'cloud');
    });

    it('falls back to a standalone development profile for a bare vite dev mode', () => {
      const resolved = environmentModule.createHostEnvironment(
        { BASE_URL: '/', DEV: true, MODE: 'development', PROD: false, SSR: false },
        'http://127.0.0.1:5173',
      );
      assert.equal(resolved.lifecycleEnvironment, 'development');
      assert.equal(resolved.deploymentProfile, 'standalone');
      assert.equal(resolved.profileId, 'standalone.development');
    });

    it('prefers an explicit Vite override and rejects an unusable one', () => {
      const overridden = environmentModule.createHostEnvironment(
        { ...viteBuildEnv('standalone.development'), VITE_SDKWORK_CLOUDROUTER_H5_ENVIRONMENT: 'staging' },
        'https://example.test',
      );
      assert.equal(overridden.lifecycleEnvironment, 'staging');
      assert.equal(overridden.profileId, 'standalone.development');

      assert.throws(
        () => environmentModule.createHostEnvironment(
          { ...viteBuildEnv('standalone.development'), VITE_SDKWORK_CLOUDROUTER_H5_ENVIRONMENT: 'yolo' },
          'https://example.test',
        ),
        /must name a lifecycle environment/u,
      );
    });

    it('parses a profile id and rejects a non-profile id', () => {
      assert.deepEqual(environmentModule.parseCloudRouterH5ProfileId('cloud.staging'), {
        deploymentProfile: 'cloud',
        lifecycleEnvironment: 'staging',
        profileId: 'cloud.staging',
      });
      assert.equal(environmentModule.parseCloudRouterH5ProfileId('development'), null);
      assert.equal(environmentModule.parseCloudRouterH5ProfileId('cloud.demo.extra'), null);
      assert.equal(environmentModule.parseCloudRouterH5ProfileId(undefined), null);
    });
  }
});

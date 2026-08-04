import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import esbuild from 'esbuild';

import { createPortalOptimizeDepsEsbuildPlugin } from './lib/portal-optimize-deps-esbuild-resolver.mjs';
import {
  isGenerationAssetConfigStubContents,
  isGenerationAssetConfigStubPath,
  readGenerationAssetConfigStubReplacement,
} from './lib/portal-generation-asset-config-stub.mjs';

const portalRoot = path.resolve(import.meta.dirname, '..');

test('generation asset config stub detection matches modality re-export shims', () => {
  const stubPath = path.resolve(
    portalRoot,
    '../../../sdkwork-audio/apps/sdkwork-audio-pc/packages/sdkwork-audio-pc-generation/src/generation-asset-config.ts',
  );

  assert.equal(isGenerationAssetConfigStubPath(stubPath), true);
  assert.equal(
    isGenerationAssetConfigStubContents("export * from '@sdkwork/generations-pc-asset-config';\r\n"),
    true,
  );
});

test('generation asset config stub replacement inlines canonical exports', () => {
  const stubPath = path.resolve(
    portalRoot,
    '../../../sdkwork-generations/apps/sdkwork-generations-pc/packages/sdkwork-generations-pc-workspace/src/generation-asset-config.ts',
  );
  const replacement = readGenerationAssetConfigStubReplacement(portalRoot, stubPath, stubPath);

  assert.match(replacement ?? '', /export function createDefaultSdkworkGenerationAssetConfig/u);
  assert.match(replacement ?? '', /export function serializeSdkworkGenerationAssetConfig/u);
});

test('optimize deps esbuild plugin inlines generation asset config stubs during scan', async () => {
  const history = path.resolve(
    portalRoot,
    '../../../sdkwork-generations/apps/sdkwork-generations-pc/packages/sdkwork-generations-pc-workspace/src/generation-history.ts',
  );
  const plugin = createPortalOptimizeDepsEsbuildPlugin(portalRoot, [], new Set(['react', 'react-dom', 'react/jsx-runtime']));
  const blockPlugin = {
    name: 'block-asset-config-package',
    setup(build) {
      build.onResolve({ filter: /^@sdkwork\/generations-pc-asset-config$/ }, () => ({
        path: 'blocked',
        namespace: 'blocked-asset-config',
      }));
      build.onLoad({ filter: /.*/, namespace: 'blocked-asset-config' }, () => ({
        contents: 'export {};',
        loader: 'js',
      }));
    },
  };

  await assert.doesNotReject(async () => {
    await esbuild.build({
      entryPoints: [history],
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'browser',
      absWorkingDir: portalRoot,
      plugins: [plugin, blockPlugin],
      logLevel: 'silent',
    });
  });
});

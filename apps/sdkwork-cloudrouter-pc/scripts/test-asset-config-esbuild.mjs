import esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createPortalOptimizeDepsEsbuildPlugin } from './lib/portal-optimize-deps-esbuild-resolver.mjs';
import { resolvePortalWorkspaceDependencyRoot } from '../vite.config.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const portalRoot = path.resolve(scriptDir, '..');
const portalWorkspaceDependencyRoots = [
  'sdkwork-appbase',
  'sdkwork-generations',
  'sdkwork-audio',
  'sdkwork-image',
  'sdkwork-video',
  'sdkwork-music',
].map((repo) => resolvePortalWorkspaceDependencyRoot(portalRoot, repo));
const plugin = createPortalOptimizeDepsEsbuildPlugin(portalRoot, portalWorkspaceDependencyRoots, new Set(['react', 'react/jsx-runtime']));
const stub = path.resolve(
  portalRoot,
  '../../../sdkwork-audio/apps/sdkwork-audio-pc/packages/sdkwork-audio-pc-generation/src/generation-asset-config.ts',
);
const panel = path.resolve(
  portalRoot,
  '../../../sdkwork-audio/apps/sdkwork-audio-pc/packages/sdkwork-audio-pc-generation/src/components/AudioGenerationPanel.tsx',
);

async function tryBuild(label, options) {
  try {
    await esbuild.build({
      entryPoints: [options.entry ?? stub],
      bundle: true,
      write: false,
      platform: 'browser',
      format: 'esm',
      logLevel: 'error',
      plugins: options.plugins ?? [],
      external: options.external ?? [],
    });
    console.log(`${label}: ok`);
  } catch (error) {
    const messages = error.errors?.slice(0, 5).map((entry) => entry.text).join('\n') ?? String(error.message).slice(0, 500);
    console.log(`${label}: fail\n${messages}`);
  }
}

await tryBuild('stub without plugin', { entry: stub });
await tryBuild('stub with plugin', { entry: stub, plugins: [plugin] });
await tryBuild('panel with plugin', { entry: panel, plugins: [plugin], external: ['react', 'react/jsx-runtime', 'react-i18next', 'lucide-react'] });

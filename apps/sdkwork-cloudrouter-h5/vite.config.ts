import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { resolveBrowserDistOutDir } from '../../../sdkwork-specs/tools/browser-dist-layout.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveViteEnvironment(mode: string | undefined, processEnv = process.env) {
  const profileMatch = /^(standalone|cloud)\.(development|test|staging|production)$/u.exec(mode ?? '');
  return (
    profileMatch?.[2]
    ?? (['development', 'test', 'staging', 'production'].includes(processEnv.SDKWORK_ENVIRONMENT ?? '')
      ? (processEnv.SDKWORK_ENVIRONMENT ?? 'production')
      : 'production')
  );
}

// Canonical Adaptive Web H5 production layout:
//   dist/<deploymentProfile>/<envAlias> — e.g. dist/cloud/dev, dist/cloud/prod
// (browser-dist-layout.mjs is the authority; FRONTEND_CODE_SPEC.md §7.)
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: resolveBrowserDistOutDir(resolveViteEnvironment(mode), process.env.SDKWORK_DEPLOYMENT_PROFILE),
    emptyOutDir: true,
  },
}));

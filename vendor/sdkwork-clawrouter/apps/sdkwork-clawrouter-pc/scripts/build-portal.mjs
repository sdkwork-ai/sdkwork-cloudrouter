import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { ensureClawRouterBrowserProductionEnv } from '../../../scripts/dev/claw-router-application-env.mjs';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const MAX_OLD_SPACE_SIZE_MB = 8192;
const HEAP_BOOTSTRAP_ENV = 'CLAWROUTER_PORTAL_BUILD_HEAP_BOOTSTRAPPED';

if (process.env[HEAP_BOOTSTRAP_ENV] !== '1') {
  const result = spawnSync(
    process.execPath,
    [`--max-old-space-size=${MAX_OLD_SPACE_SIZE_MB}`, import.meta.filename, ...process.argv.slice(2)],
    {
      env: {
        ...process.env,
        [HEAP_BOOTSTRAP_ENV]: '1',
      },
      stdio: 'inherit',
    },
  );

  process.exit(result.status ?? 1);
}

process.env.NODE_ENV = "production";

ensureClawRouterBrowserProductionEnv({ workspaceRoot });

const { build } = await import("vite");

await build({
  configLoader: 'native',
});

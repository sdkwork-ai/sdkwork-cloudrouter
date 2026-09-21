#!/usr/bin/env node
// One-time local development bootstrap for the security material that the
// gateway requires at startup (upstream credential key ring + internal gateway
// signing secret). The retired start-workspace orchestrator created these
// automatically on every dev plan; the sdkwork-app lifecycle merges them from
// `.env.postgres` instead, so fresh machines create the files once with:
//   node scripts/dev/create-dev-security-files.mjs
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ensureCloudRouterDevSecurityFiles } from './start-workspace.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const resolved = ensureCloudRouterDevSecurityFiles({ workspaceRoot: repoRoot, env: process.env });
for (const [name, value] of Object.entries(resolved)) {
  console.log(`${name}=${value}`);
}

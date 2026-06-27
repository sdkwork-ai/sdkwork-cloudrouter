#!/usr/bin/env node

import { ensureClawRouterNodeDeps } from './lib/ensure-claw-router-node-deps.mjs';

ensureClawRouterNodeDeps();
await import('./lib/claw-router-dev-main.mjs');

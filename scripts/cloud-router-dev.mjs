#!/usr/bin/env node

import { ensureCloudRouterNodeDeps } from './lib/ensure-cloud-router-node-deps.mjs';

ensureCloudRouterNodeDeps();
await import('./lib/cloud-router-dev-main.mjs');

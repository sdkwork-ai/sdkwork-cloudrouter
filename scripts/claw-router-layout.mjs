#!/usr/bin/env node

import { existsSync } from 'node:fs';
import path from 'node:path';

const WORKSPACE_ROOT_MARKERS = ['sdkwork-specs', 'sdkwork-clawrouter'];

function findWorkspaceRoot(startPath) {
  let current = path.resolve(startPath);
  while (true) {
    if (WORKSPACE_ROOT_MARKERS.every((marker) => existsSync(path.join(current, marker)))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

export function resolveClawRouterBusinessAppsRoot(startPath = path.resolve(import.meta.dirname, '..')) {
  return findWorkspaceRoot(startPath) ?? path.resolve(startPath, '..');
}

export function resolveClawRouterAppStandardToolsRoot(startPath = path.resolve(import.meta.dirname, '..')) {
  return resolveClawRouterBusinessAppsRoot(startPath);
}

export function resolveClawRouterBusinessRoot(startPath = path.resolve(import.meta.dirname, '..')) {
  return resolveClawRouterBusinessAppsRoot(startPath);
}

export function resolveClawRouterBusinessSpecsRoot(startPath = path.resolve(import.meta.dirname, '..')) {
  return path.join(resolveClawRouterBusinessRoot(startPath), 'sdkwork-specs');
}

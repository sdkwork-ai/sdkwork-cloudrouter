#!/usr/bin/env node

import { existsSync } from 'node:fs';
import path from 'node:path';

const WORKSPACE_ROOT_MARKERS = ['sdkwork-specs', 'sdkwork-cloudrouter'];

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

export function resolveCloudRouterBusinessAppsRoot(startPath = path.resolve(import.meta.dirname, '..')) {
  return findWorkspaceRoot(startPath) ?? path.resolve(startPath, '..');
}

export function resolveCloudRouterAppStandardToolsRoot(startPath = path.resolve(import.meta.dirname, '..')) {
  return resolveCloudRouterBusinessAppsRoot(startPath);
}

export function resolveCloudRouterBusinessRoot(startPath = path.resolve(import.meta.dirname, '..')) {
  return resolveCloudRouterBusinessAppsRoot(startPath);
}

export function resolveCloudRouterBusinessSpecsRoot(startPath = path.resolve(import.meta.dirname, '..')) {
  return path.join(resolveCloudRouterBusinessRoot(startPath), 'sdkwork-specs');
}

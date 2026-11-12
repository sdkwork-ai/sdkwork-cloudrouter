import { describe, expect, test } from 'vitest';

import {
  HARDWARE_ADMIN_DEFAULT_PATH,
  HARDWARE_ADMIN_MENU,
  HARDWARE_ADMIN_MODULE_DEF,
  HARDWARE_ADMIN_PERMISSION_HINTS,
  HARDWARE_ADMIN_ROUTE_PREFIX,
  HARDWARE_ADMIN_ROUTE_RECORDS,
} from './contribution.ts';

function collectMenuPaths(): string[] {
  const paths: string[] = (HARDWARE_ADMIN_MENU.items ?? []).map((item) => item.path);
  for (const group of HARDWARE_ADMIN_MENU.groups) {
    paths.push(...group.items.map((item) => item.path));
  }
  return paths;
}

function hostPath(recordPath: string): string {
  return `/admin/${recordPath}`;
}

function routePathList(): string[] {
  return HARDWARE_ADMIN_ROUTE_RECORDS.map((record) => hostPath(record.path));
}

describe('smart hardware admin contribution', () => {
  test('the module owns one path prefix and a reachable default path', () => {
    expect(HARDWARE_ADMIN_MODULE_DEF.id).toBe('hardwareCenter');
    expect(HARDWARE_ADMIN_MODULE_DEF.pathPrefixes).toEqual([HARDWARE_ADMIN_ROUTE_PREFIX]);
    expect(HARDWARE_ADMIN_DEFAULT_PATH.startsWith(HARDWARE_ADMIN_ROUTE_PREFIX)).toBe(true);
    expect(routePathList()).toContain(HARDWARE_ADMIN_DEFAULT_PATH);
  });

  test('every menu entry resolves to exactly one route record', () => {
    const recordPaths = routePathList();
    for (const menuPath of collectMenuPaths()) {
      expect(recordPaths.filter((recordPath) => recordPath === menuPath)).toHaveLength(1);
    }
  });

  test('every route record is either a menu entry or a detail route', () => {
    const menuPaths = new Set(collectMenuPaths());
    for (const record of HARDWARE_ADMIN_ROUTE_RECORDS) {
      const resolved = hostPath(record.path);
      expect(menuPaths.has(resolved) || resolved.includes(':')).toBe(true);
    }
  });

  test('route records are unique and stay inside the module prefix', () => {
    const paths = HARDWARE_ADMIN_ROUTE_RECORDS.map((record) => record.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) {
      expect(path.startsWith('hardware')).toBe(true);
    }
  });

  test('every route declares the admin permission and a permission hint covers it', () => {
    for (const record of HARDWARE_ADMIN_ROUTE_RECORDS) {
      expect(record.requiredPermission).toBe('cloudrouter.admin.access');
      const resolved = hostPath(record.path);
      const hint = HARDWARE_ADMIN_PERMISSION_HINTS
        .filter((candidate) => resolved === candidate.pathPrefix || resolved.startsWith(`${candidate.pathPrefix}/`))
        .sort((left, right) => right.pathPrefix.length - left.pathPrefix.length)[0];
      expect(hint?.requiredPermission).toBe(record.requiredPermission);
    }
  });

  test('screen identifiers are unique so the host element map stays total', () => {
    const screens = HARDWARE_ADMIN_ROUTE_RECORDS.map((record) => record.screen);
    expect(new Set(screens).size).toBe(screens.length);
  });
});

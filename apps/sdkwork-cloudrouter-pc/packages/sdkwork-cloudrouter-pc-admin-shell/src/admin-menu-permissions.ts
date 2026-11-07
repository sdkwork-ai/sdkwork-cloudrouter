import { hasPermissionInScope } from '@sdkwork/iam-contracts';

import {
  ADMIN_MODULE_MENUS,
  type AdminMenuGroup,
  type AdminMenuItem,
  type AdminModuleId,
  type AdminModuleMenu,
} from './adminModuleRegistry.ts';
import { resolveAdminRoutePermissionHint } from './admin-route-permission-hints.ts';

export function isAdminRouteAllowed(path: string, permissionScope: readonly string[]): boolean {
  const requiredPermission = resolveAdminRoutePermissionHint(path);
  if (!requiredPermission) {
    return true;
  }
  return hasPermissionInScope(permissionScope, requiredPermission);
}

function filterMenuItems(
  items: readonly AdminMenuItem[],
  permissionScope: readonly string[],
): AdminMenuItem[] {
  return items.filter((item) => isAdminRouteAllowed(item.path, permissionScope));
}

function filterMenuGroup(
  group: AdminMenuGroup,
  permissionScope: readonly string[],
): AdminMenuGroup | null {
  const items = filterMenuItems(group.items, permissionScope);
  const groups = (group.groups ?? [])
    .map((nestedGroup) => filterMenuGroup(nestedGroup, permissionScope))
    .filter((nestedGroup): nestedGroup is AdminMenuGroup => nestedGroup !== null);

  if (items.length === 0 && groups.length === 0) {
    return null;
  }

  return {
    ...group,
    items,
    ...(groups.length > 0 ? { groups } : {}),
  };
}

function countMenuItems(menu: AdminModuleMenu): number {
  const groupItemCount = (groups: readonly AdminMenuGroup[]): number => groups.reduce(
    (total, group) => total + group.items.length + groupItemCount(group.groups ?? []),
    0,
  );

  return (menu.items?.length ?? 0) + groupItemCount(menu.groups);
}

export function filterAdminModuleMenu(
  menu: AdminModuleMenu,
  permissionScope: readonly string[],
): AdminModuleMenu {
  const filteredItems = menu.items ? filterMenuItems(menu.items, permissionScope) : undefined;
  const filteredGroups = menu.groups
    .map((group) => filterMenuGroup(group, permissionScope))
    .filter((group): group is AdminMenuGroup => group !== null);

  return {
    moduleId: menu.moduleId,
    ...(filteredItems && filteredItems.length > 0 ? { items: filteredItems } : {}),
    groups: filteredGroups,
  };
}

export function getFilteredAdminModuleMenu(
  moduleId: AdminModuleId,
  permissionScope: readonly string[],
): AdminModuleMenu {
  const menu = ADMIN_MODULE_MENUS.find((entry) => entry.moduleId === moduleId) ?? ADMIN_MODULE_MENUS[0]!;
  return filterAdminModuleMenu(menu, permissionScope);
}

export function isAdminModuleVisible(moduleId: AdminModuleId, permissionScope: readonly string[]): boolean {
  return countMenuItems(getFilteredAdminModuleMenu(moduleId, permissionScope)) > 0;
}

export function listVisibleAdminModuleIds(permissionScope: readonly string[]): AdminModuleId[] {
  return ADMIN_MODULE_MENUS
    .filter((menu) => isAdminModuleVisible(menu.moduleId, permissionScope))
    .map((menu) => menu.moduleId);
}

import type { AdminMenuGroup, AdminMenuItem, AdminModuleMenu } from './adminModuleRegistry.ts';

function isPathMatch(pathname: string, itemPath: string): boolean {
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

function pickMostSpecificMatch(pathname: string, items: readonly AdminMenuItem[]): AdminMenuItem | null {
  let bestMatch: AdminMenuItem | null = null;

  for (const item of items) {
    if (!isPathMatch(pathname, item.path)) {
      continue;
    }

    if (!bestMatch || item.path.length > bestMatch.path.length) {
      bestMatch = item;
    }
  }

  return bestMatch;
}

function collectMenuItems(menu: AdminModuleMenu): AdminMenuItem[] {
  return [...(menu.items ?? []), ...menu.groups.flatMap((group) => group.items)];
}

/**
 * The single menu entry whose path most specifically matches the current
 * location, searched across top-level items and every group of the module
 * menu. A module-wide winner guarantees that a prefix entry (for example the
 * partner workbench at `/admin/partner` versus `/admin/partner/stats`) never
 * highlights together with a nested sibling in another group.
 */
function pickMostSpecificMenuMatch(pathname: string, menu: AdminModuleMenu): AdminMenuItem | null {
  return pickMostSpecificMatch(pathname, collectMenuItems(menu));
}

export function isSidebarItemActive(
  pathname: string,
  item: AdminMenuItem,
  menu: AdminModuleMenu,
): boolean {
  return pickMostSpecificMenuMatch(pathname, menu)?.path === item.path;
}

export function hasActiveSidebarGroupItem(
  pathname: string,
  group: AdminMenuGroup,
  menu: AdminModuleMenu,
): boolean {
  const match = pickMostSpecificMenuMatch(pathname, menu);
  return match !== null && group.items.some((item) => item.path === match.path);
}

export function getActiveSidebarItemPaths(pathname: string, menu: AdminModuleMenu): string[] {
  const match = pickMostSpecificMenuMatch(pathname, menu);
  return match ? [match.path] : [];
}

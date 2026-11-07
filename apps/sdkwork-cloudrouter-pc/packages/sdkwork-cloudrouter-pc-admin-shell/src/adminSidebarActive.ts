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

function collectGroupItems(group: AdminMenuGroup): AdminMenuItem[] {
  return [
    ...group.items,
    ...(group.groups ?? []).flatMap((nestedGroup) => collectGroupItems(nestedGroup)),
  ];
}

function collectMenuItems(menu: AdminModuleMenu): AdminMenuItem[] {
  return [...(menu.items ?? []), ...menu.groups.flatMap((group) => collectGroupItems(group))];
}

/**
 * The single menu entry whose path most specifically matches the current
 * location, searched across top-level items and every group (including nested
 * groups) of the module menu. A module-wide winner guarantees that a prefix
 * entry (for example the partner workbench at `/admin/partner` versus
 * `/admin/partner/stats`) never highlights together with a nested sibling in
 * another group.
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

function groupContainsPath(group: AdminMenuGroup, path: string): boolean {
  return group.items.some((item) => item.path === path)
    || (group.groups ?? []).some((nestedGroup) => groupContainsPath(nestedGroup, path));
}

/**
 * True when the active page belongs to this group or to any group nested
 * inside it, so every ancestor header along the three-level navigation path
 * stays highlighted.
 */
export function hasActiveSidebarGroupItem(
  pathname: string,
  group: AdminMenuGroup,
  menu: AdminModuleMenu,
): boolean {
  const match = pickMostSpecificMenuMatch(pathname, menu);
  return match !== null && groupContainsPath(group, match.path);
}

export function getActiveSidebarItemPaths(pathname: string, menu: AdminModuleMenu): string[] {
  const match = pickMostSpecificMenuMatch(pathname, menu);
  return match ? [match.path] : [];
}

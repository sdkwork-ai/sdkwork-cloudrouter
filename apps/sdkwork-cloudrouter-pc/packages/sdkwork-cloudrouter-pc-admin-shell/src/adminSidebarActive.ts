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

export function isSidebarItemActive(
  pathname: string,
  item: AdminMenuItem,
  siblingItems: readonly AdminMenuItem[],
): boolean {
  return pickMostSpecificMatch(pathname, siblingItems)?.path === item.path;
}

export function hasActiveSidebarGroupItem(pathname: string, group: AdminMenuGroup): boolean {
  return pickMostSpecificMatch(pathname, group.items) !== null;
}

export function getActiveSidebarItemPaths(pathname: string, menu: AdminModuleMenu): string[] {
  const activePaths: string[] = [];
  const topLevelMatch = menu.items ? pickMostSpecificMatch(pathname, menu.items) : null;

  if (topLevelMatch) {
    activePaths.push(topLevelMatch.path);
  }

  for (const group of menu.groups) {
    const match = pickMostSpecificMatch(pathname, group.items);
    if (match) {
      activePaths.push(match.path);
    }
  }

  return activePaths;
}

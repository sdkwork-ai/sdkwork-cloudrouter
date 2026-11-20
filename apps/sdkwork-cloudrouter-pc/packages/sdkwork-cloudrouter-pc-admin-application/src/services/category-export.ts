import type { AppStoreCategory } from "../types/appstore-categories";
import type { ScaffoldCategory } from "../services/application-scaffold-admin";

export interface CategoryExportLocalization {
  locale: string;
  displayName: string;
  description?: string;
}

export interface CategoryExportNode {
  code: string;
  name: string;
  parentCode: string | null;
  level?: number;
  status: string;
  sortOrder: number;
  localizations?: readonly CategoryExportLocalization[];
  children: CategoryExportNode[];
}

export interface CategoryExportDocument {
  schemaVersion: 1;
  exportedAt: string;
  kind: "appstore-categories" | "scaffold-categories";
  categories: CategoryExportNode[];
}

interface ExportSource {
  id: string;
  parentId?: string;
  code: string;
  name: string;
  level?: number;
  status: string;
  sortOrder: number;
  localizations?: readonly CategoryExportLocalization[];
}

/** Build an ancestor-first nested tree for a stable JSON backup. */
export function buildCategoryExportTree(sources: readonly ExportSource[]): CategoryExportNode[] {
  const nodes = new Map<string, CategoryExportNode>();
  const parentIds = new Map<string, string | undefined>();
  for (const source of sources) {
    parentIds.set(source.id, source.parentId);
    nodes.set(source.id, {
      code: source.code,
      name: source.name,
      parentCode: null,
      ...(source.level === undefined ? {} : { level: source.level }),
      status: source.status,
      sortOrder: source.sortOrder,
      ...(source.localizations ? { localizations: source.localizations } : {}),
      children: [],
    });
  }

  const roots: CategoryExportNode[] = [];
  for (const source of sources) {
    const node = nodes.get(source.id);
    if (!node) {
      continue;
    }
    const parentId = parentIds.get(source.id);
    const parent = parentId ? nodes.get(parentId) : undefined;
    if (parent) {
      node.parentCode = parent.code;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sort = (nodesToSort: CategoryExportNode[]): void => {
    nodesToSort.sort((left, right) => left.sortOrder - right.sortOrder || left.code.localeCompare(right.code));
    for (const node of nodesToSort) {
      sort(node.children);
    }
  };
  sort(roots);
  return roots;
}

export function buildAppStoreCategoryExport(
  categories: readonly AppStoreCategory[],
  resolveName: (category: AppStoreCategory) => string,
  now = new Date(),
): CategoryExportDocument {
  const sources = categories.map((category) => ({
    id: category.id,
    ...(category.parentId ? { parentId: category.parentId } : {}),
    code: category.code,
    name: resolveName(category) || category.code,
    level: category.level,
    status: category.status,
    sortOrder: category.sortOrder ?? 0,
    localizations: category.localizations,
  }));
  return {
    schemaVersion: 1,
    exportedAt: now.toISOString(),
    kind: "appstore-categories",
    categories: buildCategoryExportTree(sources),
  };
}

export function buildScaffoldCategoryExport(
  categories: readonly ScaffoldCategory[],
  now = new Date(),
): CategoryExportDocument {
  const sources = categories.map((category) => ({
    id: category.id,
    ...(category.parentId ? { parentId: category.parentId } : {}),
    code: category.categoryKey,
    name: category.displayName,
    status: category.status,
    sortOrder: category.sortOrder ?? 0,
  }));
  return {
    schemaVersion: 1,
    exportedAt: now.toISOString(),
    kind: "scaffold-categories",
    categories: buildCategoryExportTree(sources),
  };
}

/** Trigger a browser download; no-op outside a browser (tests/SSR). */
export function downloadJsonDocument(payload: CategoryExportDocument, filename: string): void {
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") {
    return;
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

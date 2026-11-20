import type { CategoryExportDocument, CategoryExportLocalization } from "./category-export";

export type CategoryImportKind = "appstore-categories" | "scaffold-categories";

export type CategoryImportErrorCode =
  | "invalid-document"
  | "invalid-category"
  | "duplicate-code"
  | "existing-code"
  | "depth-exceeded";

export interface PlannedCategoryImport {
  code: string;
  name: string;
  parentCode?: string;
  depth: number;
  sortOrder: number;
  status?: string;
  localizations?: readonly CategoryExportLocalization[];
}

export interface CategoryImportPlan {
  kind: CategoryImportKind;
  items: PlannedCategoryImport[];
  errors: CategoryImportErrorCode[];
}

/**
 * Validate an exported category document and flatten it into creation order.
 *
 * Nested parents always precede children, so the caller can create them with a
 * code→id map. Any structural/conflict error blocks the import before the first
 * write; the backend still owns final uniqueness.
 */
export function planCategoryImport(
  payload: unknown,
  kind: CategoryImportKind,
  existingCodes: readonly string[] = [],
): CategoryImportPlan {
  const errors: CategoryImportErrorCode[] = [];
  const items: PlannedCategoryImport[] = [];
  if (!isRecord(payload) || payload.schemaVersion !== 1 || payload.kind !== kind) {
    return { kind, items, errors: ["invalid-document"] };
  }
  if (!Array.isArray(payload.categories)) {
    return { kind, items, errors: ["invalid-document"] };
  }

  const existing = new Set(existingCodes.map((code) => code.trim().toLowerCase()));
  const seen = new Set<string>();

  const walk = (nodes: readonly unknown[], depth: number, parentCode?: string): void => {
    for (const raw of nodes) {
      if (!isRecord(raw)) {
        errors.push("invalid-category");
        continue;
      }
      const code = typeof raw.code === "string" ? raw.code.trim() : "";
      const name = typeof raw.name === "string" ? raw.name.trim() : "";
      if (!code || code.length > 64 || !name || name.length > 128) {
        errors.push("invalid-category");
        continue;
      }
      const normalizedCode = code.toLowerCase();
      if (seen.has(normalizedCode) || existing.has(normalizedCode)) {
        errors.push(seen.has(normalizedCode) ? "duplicate-code" : "existing-code");
        continue;
      }
      if (depth > 5) {
        errors.push("depth-exceeded");
        continue;
      }
      seen.add(normalizedCode);
      const localizations = Array.isArray(raw.localizations)
        ? raw.localizations.flatMap((entry): CategoryExportLocalization[] => {
            if (!isRecord(entry)) {
              return [];
            }
            const locale = typeof entry.locale === "string" ? entry.locale.trim() : "";
            const displayName = typeof entry.displayName === "string" ? entry.displayName.trim() : "";
            if (!locale || !displayName) {
              return [];
            }
            return [{
              locale,
              displayName,
              ...(typeof entry.description === "string" && entry.description.trim()
                ? { description: entry.description.trim() }
                : {}),
            }];
          })
        : undefined;
      const sortOrder = typeof raw.sortOrder === "number" && Number.isFinite(raw.sortOrder)
        ? Math.trunc(raw.sortOrder)
        : 0;
      const status = typeof raw.status === "string" ? raw.status.trim().toLowerCase() : "";
      items.push({
        code,
        name,
        ...(parentCode ? { parentCode } : {}),
        depth,
        sortOrder,
        ...(status ? { status } : {}),
        ...(kind === "appstore-categories"
          ? {
              localizations: localizations && localizations.length > 0
                ? localizations
                : [{ locale: "zh-CN", displayName: name }],
            }
          : {}),
      });
      if (Array.isArray(raw.children)) {
        walk(raw.children, depth + 1, code);
      }
    }
  };
  walk(payload.categories, 1);

  items.sort((left, right) => left.depth - right.depth || left.sortOrder - right.sortOrder || left.code.localeCompare(right.code));
  return { kind, items, errors: [...new Set(errors)] };
}

export function isCategoryExportDocument(
  payload: unknown,
  kind: CategoryImportKind,
): payload is CategoryExportDocument {
  return isRecord(payload) && payload.schemaVersion === 1 && payload.kind === kind
    && Array.isArray(payload.categories);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

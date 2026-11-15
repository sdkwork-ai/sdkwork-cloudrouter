import type {
  AppStoreCategory,
  AppStoreCategoryCreateInput,
  AppStoreCategoryLocalization,
  AppStoreCategoryUpdateInput,
  AppStoreCategoryWritableStatus,
} from "../types/appstore-categories";

/**
 * Editable category draft.
 *
 * Localizations are two fixed slots because the storefront consumes zh-CN and
 * en-US; the backend upserts by locale but has no delete-localization operation,
 * so an existing slot can never be cleared back to absent.
 */
export interface AppStoreCategoryDraftLocalization {
  locale: string;
  displayName: string;
  description: string;
  /** `true` when the saved category already had this locale. */
  existing: boolean;
}

export interface AppStoreCategoryDraft {
  code: string;
  parentId: string;
  level: string;
  sortOrder: string;
  iconMediaResourceId: string;
  status: AppStoreCategoryWritableStatus;
  localizations: AppStoreCategoryDraftLocalization[];
}

export type AppStoreCategoryDraftField =
  | "code"
  | "parent"
  | "sortOrder"
  | "icon"
  | "locale";

export type AppStoreCategoryDraftIssueCode =
  | "code-required"
  | "code-invalid"
  | "code-duplicate"
  | "name-required"
  | "name-too-long"
  | "description-too-long"
  | "sort-order-invalid"
  | "parent-missing"
  | "parent-cycle"
  | "parent-level-invalid";

export interface AppStoreCategoryDraftIssue {
  code: AppStoreCategoryDraftIssueCode;
  field: AppStoreCategoryDraftField;
  /** Present for per-locale name/description issues. */
  locale?: string;
}

export const APP_STORE_CATEGORY_LOCALES = ["zh-CN", "en-US"] as const;
export const APP_STORE_CATEGORY_CODE_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/u;
export const APP_STORE_CATEGORY_NAME_MAX_LENGTH = 80;
export const APP_STORE_CATEGORY_DESCRIPTION_MAX_LENGTH = 500;
export const APP_STORE_CATEGORY_SORT_ORDER_MAX = 999_999;

/** Empty create draft with both locale slots present. */
export function createEmptyCategoryDraft(sortOrder = 0): AppStoreCategoryDraft {
  return {
    code: "",
    parentId: "",
    level: "1",
    sortOrder: String(sortOrder),
    iconMediaResourceId: "",
    status: "active",
    localizations: APP_STORE_CATEGORY_LOCALES.map((locale) => ({
      locale,
      displayName: "",
      description: "",
      existing: false,
    })),
  };
}

/** Project a saved category into the editable draft. */
export function createCategoryDraft(category: AppStoreCategory): AppStoreCategoryDraft {
  return {
    code: category.code,
    parentId: category.parentId ?? "",
    level: String(category.level),
    sortOrder: String(category.sortOrder),
    iconMediaResourceId: category.iconMediaResourceId ?? "",
    status: category.status === "unknown" ? "inactive" : category.status,
    localizations: APP_STORE_CATEGORY_LOCALES.map((locale) => {
      const saved = category.localizations.find(
        (entry) => entry.locale.trim().toLowerCase() === locale.toLowerCase(),
      );
      return {
        locale,
        displayName: saved?.displayName ?? "",
        description: saved?.description ?? "",
        existing: Boolean(saved),
      };
    }),
  };
}

/**
 * Validate one draft against the already-loaded category set.
 *
 * `editingId` is present for updates: it enables self/descendant checks and
 * exempts the row from the duplicate-code check. The backend owns final
 * uniqueness; the client check only prevents an avoidable round trip.
 */
export function validateCategoryDraft(
  draft: AppStoreCategoryDraft,
  categories: readonly AppStoreCategory[],
  editingId?: string,
): AppStoreCategoryDraftIssue[] {
  const issues: AppStoreCategoryDraftIssue[] = [];
  const code = draft.code.trim();

  if (!code) {
    issues.push({ field: "code", code: "code-required" });
  } else if (!APP_STORE_CATEGORY_CODE_PATTERN.test(code)) {
    issues.push({ field: "code", code: "code-invalid" });
  } else if (categories.some(
    (category) => category.id !== editingId
      && category.code.trim().toLowerCase() === code.toLowerCase(),
  )) {
    issues.push({ field: "code", code: "code-duplicate" });
  }

  const primary = draft.localizations.find((entry) => entry.locale === "zh-CN");
  if (!primary?.displayName.trim()) {
    issues.push({ field: "locale", code: "name-required", locale: "zh-CN" });
  }
  for (const entry of draft.localizations) {
    const name = entry.displayName.trim();
    // An existing locale cannot be emptied: the contract upserts but never
    // removes a localization, so a blank field would silently keep the old name.
    if (entry.existing && !name) {
      issues.push({ field: "locale", code: "name-required", locale: entry.locale });
    }
    if (name.length > APP_STORE_CATEGORY_NAME_MAX_LENGTH) {
      issues.push({ field: "locale", code: "name-too-long", locale: entry.locale });
    }
    if (entry.description.trim().length > APP_STORE_CATEGORY_DESCRIPTION_MAX_LENGTH) {
      issues.push({ field: "locale", code: "description-too-long", locale: entry.locale });
    }
  }

  const sortOrder = parseSortOrder(draft.sortOrder);
  if (sortOrder === undefined) {
    issues.push({ field: "sortOrder", code: "sort-order-invalid" });
  }

  const parentId = draft.parentId.trim();
  if (parentId) {
    const parent = categories.find((category) => category.id === parentId);
    if (!parent) {
      issues.push({ field: "parent", code: "parent-missing" });
    } else if (editingId && isDescendantOrSelf(parentId, editingId, categories)) {
      issues.push({ field: "parent", code: "parent-cycle" });
    }
    const level = parseLevel(draft.level);
    if (parent && level !== parent.level + 1) {
      issues.push({ field: "parent", code: "parent-level-invalid" });
    }
  }

  return issues;
}

/** Parse a draft sort order; blank means the backend default (0). */
export function parseSortOrder(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") {
    return 0;
  }
  if (!/^-?\d+$/u.test(trimmed)) {
    return undefined;
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || Math.abs(parsed) > APP_STORE_CATEGORY_SORT_ORDER_MAX) {
    return undefined;
  }
  return parsed;
}

/** Category level derived from the selected parent. */
export function resolveDraftLevel(
  parentId: string,
  categories: readonly AppStoreCategory[],
): number {
  const parent = categories.find((category) => category.id === parentId);
  return parent ? parent.level + 1 : 1;
}

/** Build the create input; callers must have validated the draft first. */
export function toCategoryCreateInput(draft: AppStoreCategoryDraft): AppStoreCategoryCreateInput {
  return {
    code: draft.code.trim(),
    ...(draft.parentId.trim() ? { parentId: draft.parentId.trim() } : {}),
    level: parseLevel(draft.level) ?? 1,
    sortOrder: parseSortOrder(draft.sortOrder) ?? 0,
    ...(draft.iconMediaResourceId.trim()
      ? { iconMediaResourceId: draft.iconMediaResourceId.trim() }
      : {}),
    localizations: toLocalizations(draft),
  };
}

/** Build the partial update input; callers must have validated the draft first. */
export function toCategoryUpdateInput(
  draft: AppStoreCategoryDraft,
  original: AppStoreCategory,
): AppStoreCategoryUpdateInput {
  const parentId = draft.parentId.trim();
  const localizations = toLocalizations(draft);
  const parentChanged = Boolean(parentId) && parentId !== original.parentId;
  return {
    ...(parentChanged
      ? { parentId, level: parseLevel(draft.level) ?? original.level }
      : {}),
    sortOrder: parseSortOrder(draft.sortOrder) ?? original.sortOrder,
    ...(draft.status !== original.status ? { status: draft.status } : {}),
    ...(draft.iconMediaResourceId.trim()
      ? { iconMediaResourceId: draft.iconMediaResourceId.trim() }
      : {}),
    ...(localizations.length > 0 ? { localizations } : {}),
  };
}

/** Parent candidates: every loaded category except the row and its subtree. */
export function listEligibleParents(
  categories: readonly AppStoreCategory[],
  editingId?: string,
): readonly AppStoreCategory[] {
  if (!editingId) {
    return categories;
  }
  return categories.filter((category) => !isDescendantOrSelf(category.id, editingId, categories));
}

/** `true` when `candidateId` is `rootId` or lives below it. */
export function isDescendantOrSelf(
  candidateId: string,
  rootId: string,
  categories: readonly AppStoreCategory[],
): boolean {
  if (candidateId === rootId) {
    return true;
  }
  const byId = new Map(categories.map((category) => [category.id, category]));
  let current = byId.get(candidateId);
  const visited = new Set<string>();
  while (current?.parentId) {
    if (visited.has(current.id)) {
      return false;
    }
    visited.add(current.id);
    if (current.parentId === rootId) {
      return true;
    }
    current = byId.get(current.parentId);
  }
  return false;
}

/** Order loaded rows by the operator-visible sort order, then name. */
export function sortCategories(categories: readonly AppStoreCategory[], locale: string): AppStoreCategory[] {
  return [...categories].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }
    return left.code.localeCompare(right.code, locale);
  });
}

function toLocalizations(draft: AppStoreCategoryDraft): AppStoreCategoryLocalization[] {
  return draft.localizations
    .map((entry) => ({
      locale: entry.locale,
      displayName: entry.displayName.trim(),
      ...(entry.description.trim() ? { description: entry.description.trim() } : {}),
    }))
    .filter((entry) => entry.displayName.length > 0);
}

function parseLevel(value: string): number | undefined {
  const parsed = Number(value.trim());
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : undefined;
}

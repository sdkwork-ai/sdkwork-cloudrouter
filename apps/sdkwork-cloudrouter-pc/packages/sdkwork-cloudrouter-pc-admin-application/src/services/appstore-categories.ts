import { getSdkworkAppstoreBackendSdkClient } from "@sdkwork/cloudroutes-pc-commons/runtime";

import type {
  AppStoreCategory,
  AppStoreCategoryCreateInput,
  AppStoreCategoryLocalization,
  AppStoreCategoryPage,
  AppStoreCategoryService,
  AppStoreCategoryUpdateInput,
} from "../types/appstore-categories";

/**
 * App Store category transport seam.
 *
 * Declared structurally so tests can pass a plain recorder while the default
 * implementation passes the generated `@sdkwork/appstore-backend-sdk` client.
 * The generated client satisfies it because method parameters are bivariant.
 */
export interface AppStoreCategoryTransport {
  catalog: {
    appstore: {
      catalog: {
        admin: {
          categories: {
            list(params?: { cursor?: string; pageSize?: number }): Promise<unknown>;
          };
        };
        categories: {
          create(body: Record<string, unknown>): Promise<unknown>;
          update(categoryId: string, body: Record<string, unknown>): Promise<unknown>;
        };
      };
    };
  };
}

export type AppStoreCategoryErrorKind =
  | "unauthorized"
  | "forbidden"
  | "unavailable"
  | "conflict"
  | "validation"
  | "unknown";

/** Normalized failure the category panel and form switch on. */
export class AppStoreCategoryServiceError extends Error {
  readonly kind: AppStoreCategoryErrorKind;
  readonly status?: number;

  constructor(kind: AppStoreCategoryErrorKind, message: string, status?: number) {
    super(message);
    this.name = "AppStoreCategoryServiceError";
    this.kind = kind;
    if (status !== undefined) {
      this.status = status;
    }
  }
}

const CATEGORY_PAGE_SIZE = 100;
const STATUSES = new Set(["active", "inactive", "deleted"]);

/**
 * Build the category operations on top of one transport.
 *
 * Every read maps the backend's `{ category, localizations }` item into the
 * console projection; every write builds the typed OpenAPI request body and
 * normalizes failures into {@link AppStoreCategoryServiceError}.
 */
export function createAppStoreCategoryService(
  transport: AppStoreCategoryTransport,
): AppStoreCategoryService {
  const catalog = transport.catalog.appstore.catalog;

  return {
    async list(input) {
      const payload = await callCategoryOperation("list", () =>
        catalog.admin.categories.list({
          ...(input?.cursor ? { cursor: input.cursor } : {}),
          pageSize: input?.pageSize ?? CATEGORY_PAGE_SIZE,
        }),
      );
      return mapCategoryPage(payload);
    },

    async create(input) {
      const body = createCategoryRequestBody(input);
      const payload = await callCategoryOperation("create", () => catalog.categories.create(body));
      return mapCategory(payload) ?? synthesizeCreatedCategory(payload, input);
    },

    async update(id, input) {
      const body = updateCategoryRequestBody(input);
      const payload = await callCategoryOperation("update", () =>
        catalog.categories.update(id, body),
      );
      // A successful PATCH returns the aggregate, but a proxy revision may
      // strip it. The write already succeeded, so report "no row" instead of
      // turning it into a failure; the panel reloads the authoritative list.
      return mapCategory(payload);
    },
  };
}

let defaultService: AppStoreCategoryService | null = null;

/** Shared category service backed by the generated App Store backend SDK. */
export function getAppStoreCategoryService(): AppStoreCategoryService {
  if (!defaultService) {
    defaultService = createAppStoreCategoryService(
      getSdkworkAppstoreBackendSdkClient() as unknown as AppStoreCategoryTransport,
    );
  }
  return defaultService;
}

/** Drop the cached default service (session/account switches). */
export function resetAppStoreCategoryService(): void {
  defaultService = null;
}

/** `true` when the App Store backend is not mounted or not reachable. */
export function isAppStoreCategoryUnavailable(error: unknown): boolean {
  const status = errorStatus(error);
  if (status === 404 || status === 501 || status === 502 || status === 503) {
    return true;
  }
  const message = errorMessage(error).toLowerCase();
  return message.includes("not found")
    || message.includes("unavailable")
    || message.includes("econnrefused")
    || message.includes("failed to fetch")
    || message.includes("network");
}

/** `true` when the caller lacks `appstore.catalog.admin`. */
export function isAppStoreCategoryForbidden(error: unknown): boolean {
  const status = errorStatus(error);
  if (status === 401 || status === 403) {
    return true;
  }
  const message = errorMessage(error).toLowerCase();
  return message.includes("forbidden")
    || message.includes("permission")
    || message.includes("scope")
    || message.includes("unauthorized");
}

/** `true` when the category code already exists. */
export function isAppStoreCategoryConflict(error: unknown): boolean {
  if (errorStatus(error) === 409) {
    return true;
  }
  const message = errorMessage(error).toLowerCase();
  return message.includes("already exists") || message.includes("duplicate");
}

/** Category display name for one locale, falling back to the first entry. */
export function resolveCategoryDisplayName(
  category: AppStoreCategory,
  locale: string,
): string | undefined {
  const normalizedLocale = locale.trim().toLowerCase();
  const exact = category.localizations.find(
    (entry) => entry.locale.trim().toLowerCase() === normalizedLocale,
  );
  if (exact?.displayName) {
    return exact.displayName;
  }
  const base = normalizedLocale.split("-")[0];
  const partial = category.localizations.find(
    (entry) => entry.displayName && entry.locale.trim().toLowerCase().split("-")[0] === base,
  );
  if (partial?.displayName) {
    return partial.displayName;
  }
  return category.localizations.find((entry) => entry.displayName)?.displayName;
}

/** Category description for one locale, falling back to the first entry. */
export function resolveCategoryDescription(
  category: AppStoreCategory,
  locale: string,
): string | undefined {
  const normalizedLocale = locale.trim().toLowerCase();
  const exact = category.localizations.find(
    (entry) => entry.locale.trim().toLowerCase() === normalizedLocale,
  );
  return exact?.description
    ?? category.localizations.find((entry) => entry.description)?.description;
}

/** Build the typed `appstore.catalog.categories.create` request body. */
export function createCategoryRequestBody(input: AppStoreCategoryCreateInput): Record<string, unknown> {
  const localizations = normalizeLocalizations(input.localizations);
  return {
    categoryCode: input.code.trim(),
    ...(input.parentId?.trim() ? { parentCategoryId: input.parentId.trim() } : {}),
    ...(input.level === undefined ? {} : { categoryLevel: input.level }),
    ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
    ...(input.iconMediaResourceId?.trim()
      ? { iconMediaResourceId: input.iconMediaResourceId.trim() }
      : {}),
    ...(localizations.length === 0 ? {} : { localizations }),
  };
}

/** Build the typed `appstore.catalog.categories.update` request body. */
export function updateCategoryRequestBody(input: AppStoreCategoryUpdateInput): Record<string, unknown> {
  const localizations = input.localizations
    ? normalizeLocalizations(input.localizations)
    : undefined;
  return {
    ...(input.parentId?.trim() ? { parentCategoryId: input.parentId.trim() } : {}),
    ...(input.level === undefined ? {} : { categoryLevel: input.level }),
    ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
    ...(input.status === undefined ? {} : { status: input.status }),
    ...(input.iconMediaResourceId?.trim()
      ? { iconMediaResourceId: input.iconMediaResourceId.trim() }
      : {}),
    ...(localizations && localizations.length > 0 ? { localizations } : {}),
  };
}

/**
 * Map one wire item.
 *
 * The operator list returns `{ category, localizations }`; a few proxy
 * revisions flatten it, and the Rust enum serializes as `Active` while the
 * update request accepts `active`, so status parsing is case-insensitive.
 */
export function mapCategory(value: unknown): AppStoreCategory | undefined {
  const record = asRecord(value);
  const category = isRecord(record.category) ? record.category : record;
  const id = optionalString(category.id);
  if (!id) {
    return undefined;
  }
  const localizations = Array.isArray(record.localizations)
    ? record.localizations
      .map(mapLocalization)
      .filter((entry): entry is AppStoreCategoryLocalization => entry !== undefined)
    : [];
  return {
    id,
    code: optionalString(category.categoryCode) ?? optionalString(category.code) ?? id,
    ...optionalValue("parentId", optionalString(category.parentCategoryId)),
    level: numeric(category.categoryLevel) ?? 1,
    sortOrder: numeric(category.sortOrder) ?? 0,
    status: normalizeCategoryStatus(optionalString(category.status)),
    ...optionalValue("iconMediaResourceId", optionalString(category.iconMediaResourceId)),
    localizations,
    ...optionalValue("createdAt", optionalString(category.createdAt)),
    ...optionalValue("updatedAt", optionalString(category.updatedAt)),
  };
}

/** Map one list page, tolerating both `pageInfo` and flat cursor shapes. */
export function mapCategoryPage(payload: unknown): AppStoreCategoryPage {
  const record = asRecord(payload);
  const data = isRecord(record.data) ? record.data : record;
  const rawItems = Array.isArray(data.items) ? data.items : Array.isArray(record.items) ? record.items : [];
  const pageInfo = isRecord(data.pageInfo) ? data.pageInfo : {};
  const items = rawItems
    .map(mapCategory)
    .filter((item): item is AppStoreCategory => item !== undefined);
  const nextCursor = optionalString(pageInfo.nextCursor) ?? optionalString(pageInfo.next_cursor);
  return {
    items,
    hasMore: pageInfo.hasMore === true || pageInfo.has_more === true,
    ...(nextCursor ? { nextCursor } : {}),
  };
}

/** Lifecycle label key used by the page's status filter/action copy. */
export function nextCategoryStatus(status: AppStoreCategory["status"]): "active" | "inactive" {
  return status === "active" ? "inactive" : "active";
}

function normalizeCategoryStatus(value: string | undefined): AppStoreCategory["status"] {
  const normalized = value?.trim().toLowerCase();
  if (normalized && STATUSES.has(normalized)) {
    return normalized as AppStoreCategory["status"];
  }
  return "unknown";
}

function mapLocalization(value: unknown): AppStoreCategoryLocalization | undefined {
  const record = asRecord(value);
  const locale = optionalString(record.locale);
  const displayName = optionalString(record.displayName) ?? optionalString(record.display_name);
  if (!locale || !displayName) {
    return undefined;
  }
  return {
    locale,
    displayName,
    ...optionalValue("description", optionalString(record.description)),
  };
}

function normalizeLocalizations(
  localizations: readonly AppStoreCategoryLocalization[],
): Array<Record<string, string>> {
  return localizations
    .map((entry) => {
      const result: Record<string, string> = {
        locale: entry.locale.trim(),
        displayName: entry.displayName.trim(),
      };
      if (entry.description?.trim()) {
        result.description = entry.description.trim();
      }
      return result;
    })
    .filter((entry) => entry.locale.length > 0 && entry.displayName.length > 0);
}

function synthesizeCreatedCategory(
  payload: unknown,
  input: AppStoreCategoryCreateInput,
): AppStoreCategory {
  const record = asRecord(payload);
  const id = optionalString(record.resourceId)
    ?? optionalString(record.categoryId)
    ?? input.code.trim();
  return {
    id,
    code: input.code.trim(),
    ...optionalValue("parentId", input.parentId?.trim()),
    level: input.level ?? 1,
    sortOrder: input.sortOrder ?? 0,
    status: "active",
    ...optionalValue("iconMediaResourceId", input.iconMediaResourceId?.trim()),
    localizations: normalizeLocalizations(input.localizations).map((entry) => ({
      locale: entry.locale,
      displayName: entry.displayName,
      ...(entry.description ? { description: entry.description } : {}),
    })),
  };
}

async function callCategoryOperation<T>(
  operation: "list" | "create" | "update",
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw classifyCategoryError(error, operation);
  }
}

function classifyCategoryError(
  error: unknown,
  operation: "list" | "create" | "update",
): AppStoreCategoryServiceError {
  const status = errorStatus(error);
  const message = errorMessage(error)
    || `The App Store category ${operation} request failed.`;
  if (isAppStoreCategoryUnavailable({ ...asRecord(error), status })) {
    return new AppStoreCategoryServiceError("unavailable", message, status);
  }
  if (status === 401) {
    return new AppStoreCategoryServiceError("unauthorized", message, status);
  }
  if (isAppStoreCategoryForbidden(error)) {
    return new AppStoreCategoryServiceError("forbidden", message, status);
  }
  if (isAppStoreCategoryConflict(error)) {
    return new AppStoreCategoryServiceError("conflict", message, status);
  }
  if (status === 400 || status === 422) {
    return new AppStoreCategoryServiceError("validation", message, status);
  }
  return new AppStoreCategoryServiceError("unknown", message, status);
}

function errorStatus(error: unknown): number | undefined {
  const record = asRecord(error);
  const problem = asRecord(record.problem);
  return numeric(record.status)
    ?? numeric(record.statusCode)
    ?? numeric(record.httpStatus)
    ?? numeric(problem.status);
}

function errorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  const record = asRecord(error);
  const problem = asRecord(record.problem);
  return optionalString(record.message)
    ?? optionalString(problem.detail)
    ?? optionalString(problem.title)
    ?? optionalString(record.error)
    ?? "";
}

function optionalValue<K extends string, V>(
  key: K,
  value: V | undefined,
): { [P in K]?: V } {
  return (value === undefined ? {} : { [key]: value }) as { [P in K]?: V };
}

function numeric(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

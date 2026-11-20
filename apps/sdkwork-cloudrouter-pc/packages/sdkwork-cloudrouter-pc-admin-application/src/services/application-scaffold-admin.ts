import { getSdkworkDeploymentsBackendSdkClient } from "@sdkwork/cloudroutes-pc-commons/runtime";

export type { ScaffoldCategory } from "../types/application-scaffolds";

/**
 * Deploy application-scaffold backend-admin operations.
 *
 * The app-plane scaffold API lets an author submit a scaffold; the backend-admin
 * PATCH is the only way to approve, reject, disable, or re-feature it. This
 * module isolates that contract behind a typed service so the App Center does
 * not depend on generated SDK payload shapes.
 */

export type ApplicationScaffoldAdminStatus =
  | "PENDING_REVIEW"
  | "PUBLISHED"
  | "REJECTED"
  | "DISABLED";

export type ApplicationScaffoldVisibility = "PUBLIC" | "PRIVATE";

export interface ApplicationScaffoldAdminUpdateInput {
  status?: ApplicationScaffoldAdminStatus;
  reviewNote?: string;
  isFeatured?: boolean;
  visibility?: ApplicationScaffoldVisibility;
}

import type { ScaffoldCategory } from "../types/application-scaffolds";

export interface ScaffoldCategoryInput {
  categoryKey: string;
  displayName: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
  status?: "ACTIVE" | "DISABLED";
}

export interface ApplicationScaffoldAdminService {
  updateScaffold(scaffoldId: string, input: ApplicationScaffoldAdminUpdateInput): Promise<void>;
  listCategories(): Promise<readonly ScaffoldCategory[]>;
  createCategory(input: ScaffoldCategoryInput): Promise<ScaffoldCategory | undefined>;
  updateCategory(categoryId: string, input: ScaffoldCategoryInput): Promise<ScaffoldCategory | undefined>;
  deleteCategory(categoryId: string): Promise<void>;
}

/**
 * Transport derived from the generated Deploy backend client.
 *
 * Every method below is a subset of the real `AppApi.scaffolds` surface the SDK
 * exposes, so the compiler — not a comment — proves the operation names and
 * payload shapes match `/backend/v3/api/scaffolds` and
 * `/backend/v3/api/scaffold_categories` (`deploy.scaffolds.write`,
 * `deploy.scaffoldCategories.read|write`).
 */
type DeployBackendSdkClient = ReturnType<typeof getSdkworkDeploymentsBackendSdkClient>;

export interface ApplicationScaffoldAdminTransport {
  app: {
    scaffolds: Pick<DeployBackendSdkClient["app"]["scaffolds"], "update" | "categories">;
  };
}

/** Generated request bodies, so a category write cannot drift from the contract. */
type CreateCategoryBody = Parameters<DeployBackendSdkClient["app"]["scaffolds"]["categories"]["create"]>[0];
type UpdateCategoryBody = Parameters<DeployBackendSdkClient["app"]["scaffolds"]["categories"]["update"]>[1];

export type ApplicationScaffoldAdminErrorKind =
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "unavailable"
  | "validation"
  | "unknown";

export class ApplicationScaffoldAdminServiceError extends Error {
  readonly kind: ApplicationScaffoldAdminErrorKind;
  readonly status?: number;

  constructor(kind: ApplicationScaffoldAdminErrorKind, message: string, status?: number) {
    super(message);
    this.name = "ApplicationScaffoldAdminServiceError";
    this.kind = kind;
    if (status !== undefined) {
      this.status = status;
    }
  }
}

export const SCAFFOLD_CATEGORY_KEY_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/;

/** True when the deployments backend base URL is missing/misrouted (503/000). */
export function isApplicationScaffoldAdminUnavailable(error: unknown): boolean {
  return error instanceof ApplicationScaffoldAdminServiceError
    && (error.kind === "unavailable" || error.kind === "unknown");
}

export function isApplicationScaffoldAdminForbidden(error: unknown): boolean {
  return error instanceof ApplicationScaffoldAdminServiceError
    && (error.kind === "forbidden" || error.kind === "unauthorized");
}

export function createApplicationScaffoldAdminService(
  transport: ApplicationScaffoldAdminTransport,
): ApplicationScaffoldAdminService {
  const scaffoldApi = transport.app.scaffolds;

  return {
    async updateScaffold(scaffoldId, input) {
      if (!scaffoldId.trim()) {
        throw new ApplicationScaffoldAdminServiceError("validation", "scaffoldId is required");
      }
      await call("updateScaffold", () =>
        scaffoldApi.update(
          scaffoldId,
          {
            ...(input.status ? { status: input.status } : {}),
            ...(input.reviewNote !== undefined ? { reviewNote: input.reviewNote } : {}),
            ...(input.isFeatured === undefined ? {} : { isFeatured: input.isFeatured }),
            ...(input.visibility ? { visibility: input.visibility } : {}),
          },
          { idempotencyKey: createIdempotencyKey() },
        ),
      );
    },

    async listCategories() {
      const records: unknown[] = [];
      for (let pageNumber = 1; pageNumber <= 10; pageNumber += 1) {
        const payload = await call("listCategories", () =>
          scaffoldApi.categories.list({ page: pageNumber, pageSize: 200, includeDisabled: true }),
        );
        const record = asRecord(payload);
        const data = asRecord(record.data);
        const items = Array.isArray(record.items)
          ? record.items
          : Array.isArray(data.items)
            ? data.items
            : [];
        records.push(...items);
        const pageInfo = asRecord(record.pageInfo ?? data.pageInfo);
        const totalPages = readNumber(pageInfo.totalPages ?? pageInfo.total_pages);
        const hasMore = readBoolean(pageInfo.hasMore ?? pageInfo.has_more)
          ?? (totalPages === undefined ? items.length >= 200 : pageNumber < totalPages);
        if (!hasMore || items.length === 0) {
          break;
        }
      }
      return records
        .map((item) => mapCategory(item))
        .filter((item): item is ScaffoldCategory => item !== undefined)
        .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || left.displayName.localeCompare(right.displayName));
    },

    async createCategory(input) {
      validateCategoryInput(input);
      const payload = await call("createCategory", () =>
        scaffoldApi.categories.create(
          categoryCreateBody(input),
          { idempotencyKey: createIdempotencyKey() },
        ),
      );
      return mapCategory(payload);
    },

    async updateCategory(categoryId, input) {
      if (!categoryId.trim()) {
        throw new ApplicationScaffoldAdminServiceError("validation", "categoryId is required");
      }
      if (!input.displayName.trim()) {
        throw new ApplicationScaffoldAdminServiceError("validation", "displayName is required");
      }
      const payload = await call("updateCategory", () =>
        scaffoldApi.categories.update(
          categoryId,
          categoryUpdateBody(input),
          { idempotencyKey: createIdempotencyKey() },
        ),
      );
      return mapCategory(payload);
    },

    async deleteCategory(categoryId) {
      if (!categoryId.trim()) {
        throw new ApplicationScaffoldAdminServiceError("validation", "categoryId is required");
      }
      await call("deleteCategory", () => scaffoldApi.categories.delete(categoryId));
    },
  };
}

let defaultService: ApplicationScaffoldAdminService | null = null;

export function getApplicationScaffoldAdminService(): ApplicationScaffoldAdminService {
  if (!defaultService) {
    defaultService = createApplicationScaffoldAdminService(getSdkworkDeploymentsBackendSdkClient());
  }
  return defaultService;
}

export function resetApplicationScaffoldAdminService(): void {
  defaultService = null;
}

function validateCategoryInput(input: ScaffoldCategoryInput): void {
  if (!SCAFFOLD_CATEGORY_KEY_PATTERN.test(input.categoryKey.trim())) {
    throw new ApplicationScaffoldAdminServiceError("validation", "invalid category key");
  }
  if (!input.displayName.trim()) {
    throw new ApplicationScaffoldAdminServiceError("validation", "displayName is required");
  }
}

/** Optional taxonomy fields shared by the create and update request bodies. */
type CategoryOptionalFields = {
  description?: string;
  parentId?: string;
  sortOrder?: number;
  status?: "ACTIVE" | "DISABLED";
};

function optionalCategoryFields(input: ScaffoldCategoryInput): CategoryOptionalFields {
  const fields: CategoryOptionalFields = {};
  if (input.description?.trim()) {
    fields.description = input.description.trim();
  }
  if (input.parentId?.trim()) {
    fields.parentId = input.parentId.trim();
  }
  if (input.sortOrder !== undefined) {
    fields.sortOrder = input.sortOrder;
  }
  if (input.status) {
    fields.status = input.status;
  }
  return fields;
}

/** `POST /backend/v3/api/scaffold_categories` body (the key is write-once). */
function categoryCreateBody(input: ScaffoldCategoryInput): CreateCategoryBody {
  return {
    categoryKey: input.categoryKey.trim(),
    displayName: input.displayName.trim(),
    ...optionalCategoryFields(input),
  };
}

/** `PATCH /backend/v3/api/scaffold_categories/{categoryUuid}` body. */
function categoryUpdateBody(input: ScaffoldCategoryInput): UpdateCategoryBody {
  return {
    displayName: input.displayName.trim(),
    ...optionalCategoryFields(input),
  };
}

function mapCategory(value: unknown): ScaffoldCategory | undefined {
  const record = asRecord(value);
  const id = readString(record.id ?? record.categoryUuid ?? record.category_uuid);
  if (!id) {
    return undefined;
  }
  const key = readString(record.categoryKey ?? record.category_key);
  const displayName = readString(record.displayName ?? record.display_name);
  const description = readString(record.description);
  const parentId = readString(record.parentId ?? record.parent_id);
  const status = readString(record.status);
  const sortOrder = Number(record.sortOrder ?? record.sort_order ?? 0);
  return {
    id,
    categoryKey: key ?? id,
    displayName: displayName ?? key ?? id,
    ...(description ? { description } : {}),
    ...(parentId ? { parentId } : {}),
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    status: status === "DISABLED" ? "DISABLED" : "ACTIVE",
  };
}

async function call<T>(operation: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const record = asRecord(error);
    const status = Number(record.status ?? record.statusCode ?? record.status_code);
    const detail = readString(record.detail ?? record.message) ?? `${operation} failed`;
    if (status === 401) {
      throw new ApplicationScaffoldAdminServiceError("unauthorized", detail, status);
    }
    if (status === 403) {
      throw new ApplicationScaffoldAdminServiceError("forbidden", detail, status);
    }
    if (status === 404) {
      throw new ApplicationScaffoldAdminServiceError("not-found", detail, status);
    }
    if (status === 409) {
      throw new ApplicationScaffoldAdminServiceError("conflict", detail, status);
    }
    if (status === 400 || status === 422) {
      throw new ApplicationScaffoldAdminServiceError("validation", detail, status);
    }
    if (status === 429 || status === 502 || status === 503 || status === 504 || !Number.isFinite(status)) {
      throw new ApplicationScaffoldAdminServiceError("unavailable", detail, status);
    }
    throw new ApplicationScaffoldAdminServiceError("unknown", detail, status);
  }
}

function createIdempotencyKey(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  return randomUuid ?? `scaffold-admin-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === 1 || value === "1" || value === "true") {
    return true;
  }
  if (value === 0 || value === "0" || value === "false") {
    return false;
  }
  return undefined;
}

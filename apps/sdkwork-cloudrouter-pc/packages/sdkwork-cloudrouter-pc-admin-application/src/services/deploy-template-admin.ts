import { getSdkworkDeploymentsBackendSdkClient } from "@sdkwork/cloudroutes-pc-commons/runtime";

/**
 * Deploy template backend-admin operations.
 *
 * The app-plane template API lets an author submit a template; the backend-admin
 * PATCH is the only way to approve, reject, disable, or re-feature it. This
 * module isolates that contract behind a typed service so the App Center does
 * not depend on generated SDK payload shapes.
 */

export type DeployTemplateAdminStatus =
  | "PENDING_REVIEW"
  | "PUBLISHED"
  | "REJECTED"
  | "DISABLED";

export type DeployTemplateVisibility = "PUBLIC" | "PRIVATE";

export interface DeployTemplateAdminUpdateInput {
  status?: DeployTemplateAdminStatus;
  reviewNote?: string;
  isFeatured?: boolean;
  visibility?: DeployTemplateVisibility;
}

export interface DeployTemplateCategory {
  id: string;
  categoryKey: string;
  displayName: string;
  description?: string;
  parentId?: string;
  sortOrder: number;
  status: "ACTIVE" | "DISABLED";
}

export interface DeployTemplateCategoryInput {
  categoryKey: string;
  displayName: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
  status?: "ACTIVE" | "DISABLED";
}

export interface DeployTemplateAdminService {
  updateTemplate(templateId: string, input: DeployTemplateAdminUpdateInput): Promise<void>;
  listCategories(): Promise<readonly DeployTemplateCategory[]>;
  createCategory(input: DeployTemplateCategoryInput): Promise<DeployTemplateCategory | undefined>;
  updateCategory(categoryId: string, input: DeployTemplateCategoryInput): Promise<DeployTemplateCategory | undefined>;
  deleteCategory(categoryId: string): Promise<void>;
}

/** Structural transport; the generated backend client satisfies it. */
export interface DeployTemplateAdminTransport {
  template: {
    appTemplates: {
      update(
        templateId: string,
        body: Record<string, unknown>,
        params: { idempotencyKey: string },
      ): Promise<unknown>;
    };
    templateCategories: {
      list(params?: { page?: number; pageSize?: number; includeDisabled?: boolean }): Promise<unknown>;
      create(body: Record<string, unknown>, params: { idempotencyKey: string }): Promise<unknown>;
      update(
        categoryId: string,
        body: Record<string, unknown>,
        params: { idempotencyKey: string },
      ): Promise<unknown>;
      delete(categoryId: string): Promise<unknown>;
    };
  };
}

export type DeployTemplateAdminErrorKind =
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "unavailable"
  | "validation"
  | "unknown";

export class DeployTemplateAdminServiceError extends Error {
  readonly kind: DeployTemplateAdminErrorKind;
  readonly status?: number;

  constructor(kind: DeployTemplateAdminErrorKind, message: string, status?: number) {
    super(message);
    this.name = "DeployTemplateAdminServiceError";
    this.kind = kind;
    if (status !== undefined) {
      this.status = status;
    }
  }
}

export const TEMPLATE_CATEGORY_KEY_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/;

/** True when the deployments backend base URL is missing/misrouted (503/000). */
export function isDeployTemplateAdminUnavailable(error: unknown): boolean {
  return error instanceof DeployTemplateAdminServiceError
    && (error.kind === "unavailable" || error.kind === "unknown");
}

export function isDeployTemplateAdminForbidden(error: unknown): boolean {
  return error instanceof DeployTemplateAdminServiceError
    && (error.kind === "forbidden" || error.kind === "unauthorized");
}

export function createDeployTemplateAdminService(
  transport: DeployTemplateAdminTransport,
): DeployTemplateAdminService {
  const template = transport.template;

  return {
    async updateTemplate(templateId, input) {
      if (!templateId.trim()) {
        throw new DeployTemplateAdminServiceError("validation", "templateId is required");
      }
      await call("updateTemplate", () =>
        template.appTemplates.update(
          templateId,
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
      const payload = await call("listCategories", () =>
        template.templateCategories.list({ page: 1, pageSize: 200, includeDisabled: true }),
      );
      const items = asRecord(payload).items;
      return Array.isArray(items)
        ? items
          .map((item) => mapCategory(item))
          .filter((item): item is DeployTemplateCategory => item !== undefined)
          .sort((left, right) => left.sortOrder - right.sortOrder || left.displayName.localeCompare(right.displayName))
        : [];
    },

    async createCategory(input) {
      validateCategoryInput(input);
      const payload = await call("createCategory", () =>
        template.templateCategories.create(
          categoryBody(input, true),
          { idempotencyKey: createIdempotencyKey() },
        ),
      );
      return mapCategory(payload);
    },

    async updateCategory(categoryId, input) {
      if (!categoryId.trim()) {
        throw new DeployTemplateAdminServiceError("validation", "categoryId is required");
      }
      if (!input.displayName.trim()) {
        throw new DeployTemplateAdminServiceError("validation", "displayName is required");
      }
      const payload = await call("updateCategory", () =>
        template.templateCategories.update(
          categoryId,
          categoryBody(input, false),
          { idempotencyKey: createIdempotencyKey() },
        ),
      );
      return mapCategory(payload);
    },

    async deleteCategory(categoryId) {
      if (!categoryId.trim()) {
        throw new DeployTemplateAdminServiceError("validation", "categoryId is required");
      }
      await call("deleteCategory", () => template.templateCategories.delete(categoryId));
    },
  };
}

let defaultService: DeployTemplateAdminService | null = null;

export function getDeployTemplateAdminService(): DeployTemplateAdminService {
  if (!defaultService) {
    defaultService = createDeployTemplateAdminService(
      getSdkworkDeploymentsBackendSdkClient() as unknown as DeployTemplateAdminTransport,
    );
  }
  return defaultService;
}

export function resetDeployTemplateAdminService(): void {
  defaultService = null;
}

function validateCategoryInput(input: DeployTemplateCategoryInput): void {
  if (!TEMPLATE_CATEGORY_KEY_PATTERN.test(input.categoryKey.trim())) {
    throw new DeployTemplateAdminServiceError("validation", "invalid category key");
  }
  if (!input.displayName.trim()) {
    throw new DeployTemplateAdminServiceError("validation", "displayName is required");
  }
}

function categoryBody(input: DeployTemplateCategoryInput, includeKey: boolean): Record<string, unknown> {
  return {
    ...(includeKey ? { categoryKey: input.categoryKey.trim() } : {}),
    displayName: input.displayName.trim(),
    ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    ...(input.parentId?.trim() ? { parentId: input.parentId.trim() } : {}),
    ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
    ...(input.status ? { status: input.status } : {}),
  };
}

function mapCategory(value: unknown): DeployTemplateCategory | undefined {
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
      throw new DeployTemplateAdminServiceError("unauthorized", detail, status);
    }
    if (status === 403) {
      throw new DeployTemplateAdminServiceError("forbidden", detail, status);
    }
    if (status === 404) {
      throw new DeployTemplateAdminServiceError("not-found", detail, status);
    }
    if (status === 409) {
      throw new DeployTemplateAdminServiceError("conflict", detail, status);
    }
    if (status === 400 || status === 422) {
      throw new DeployTemplateAdminServiceError("validation", detail, status);
    }
    if (status === 429 || status === 502 || status === 503 || status === 504 || !Number.isFinite(status)) {
      throw new DeployTemplateAdminServiceError("unavailable", detail, status);
    }
    throw new DeployTemplateAdminServiceError("unknown", detail, status);
  }
}

function createIdempotencyKey(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  return randomUuid ?? `template-admin-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

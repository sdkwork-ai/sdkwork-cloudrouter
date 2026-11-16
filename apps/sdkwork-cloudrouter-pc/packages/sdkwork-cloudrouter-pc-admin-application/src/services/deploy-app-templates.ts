import { getSdkworkDeploymentsAppSdkClient } from "@sdkwork/cloudroutes-pc-commons/runtime";

import type {
  DeployAppOption,
  DeployAppTemplate,
  DeployAppTemplateCategory,
  DeployAppTemplatePage,
  DeployAppTemplateService,
  DeployAppTemplateStatus,
  DeployAppTemplateVersion,
  DeployTemplateCategoryStatus,
} from "../types/deploy-app-templates";

/**
 * Deploy app-template transport seam.
 *
 * Declared structurally so tests can pass a recorder while the default
 * implementation uses the generated `@sdkwork/deployments-app-sdk` client the
 * Cloud Router runtime already provides. The template authoring surface lives
 * on the Deploy app API (`/app/v3/api/app_templates`); the backend-admin
 * counterpart only moderates, so the App Center authors here.
 */
export interface DeployAppTemplateTransport {
  app: {
    list(params?: { page?: number; pageSize?: number }): Promise<unknown>;
  };
  template: {
    templateCategories: {
      list(params?: { includeDisabled?: boolean }): Promise<unknown>;
    };
    appTemplates: {
      list(params?: {
        page?: number;
        pageSize?: number;
        keyword?: string;
        status?: DeployAppTemplateStatus;
      }): Promise<unknown>;
      retrieve(templateUuid: string): Promise<unknown>;
      create(body: object, params: { idempotencyKey: string }): Promise<unknown>;
      update(
        templateUuid: string,
        body: object,
        params: { idempotencyKey: string },
      ): Promise<unknown>;
      delete(templateUuid: string): Promise<void>;
      submit(templateUuid: string): Promise<unknown>;
    };
    appTemplateVersions: {
      list(templateUuid: string, params?: { page?: number; pageSize?: number }): Promise<unknown>;
      create(
        templateUuid: string,
        body: object,
        params: { idempotencyKey: string },
      ): Promise<unknown>;
    };
  };
}

export type DeployAppTemplateErrorKind =
  | "unauthorized"
  | "forbidden"
  | "unavailable"
  | "conflict"
  | "validation"
  | "unknown";

/** Normalized failure the template panel and drawer switch on. */
export class DeployAppTemplateServiceError extends Error {
  readonly kind: DeployAppTemplateErrorKind;
  readonly status?: number;

  constructor(kind: DeployAppTemplateErrorKind, message: string, status?: number) {
    super(message);
    this.name = "DeployAppTemplateServiceError";
    this.kind = kind;
    if (status !== undefined) {
      this.status = status;
    }
  }
}

const TEMPLATE_PAGE_SIZE = 20;
const VERSION_PAGE_SIZE = 100;
const APP_PAGE_SIZE = 500;
const KNOWN_STATUSES = new Set<DeployAppTemplateStatus>([
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "REJECTED",
  "DISABLED",
]);

/** Build the template operations on top of one transport. */
export function createDeployAppTemplateService(
  transport: DeployAppTemplateTransport,
): DeployAppTemplateService {
  const templateApi = transport.template;

  return {
    async list(input) {
      const payload = await call("list", () =>
        templateApi.appTemplates.list({
          page: input?.page ?? 1,
          pageSize: input?.pageSize ?? TEMPLATE_PAGE_SIZE,
          ...(input?.keyword ? { keyword: input.keyword } : {}),
          ...(input?.status ? { status: input.status } : {}),
        }));
      return mapTemplatePage(payload);
    },

    async listApps() {
      const payload = await call("listApps", () =>
        transport.app.list({ page: 1, pageSize: APP_PAGE_SIZE }));
      return readItems(payload)
        .map(mapApp)
        .filter((app): app is DeployAppOption => app !== undefined);
    },

    async listCategories() {
      const payload = await call("listCategories", () =>
        templateApi.templateCategories.list({ includeDisabled: true }));
      return readItems(payload)
        .map(mapCategory)
        .filter((category): category is DeployAppTemplateCategory => category !== undefined);
    },

    async create(input) {
      const payload = await call("create", () =>
        templateApi.appTemplates.create(toCreateBody(input), idempotencyParams()));
      return requireTemplate(payload);
    },

    async update(templateId, input) {
      const payload = await call("update", () =>
        templateApi.appTemplates.update(templateId, toUpdateBody(input), idempotencyParams()));
      return requireTemplate(payload);
    },

    async remove(templateId) {
      await call("remove", () => templateApi.appTemplates.delete(templateId));
    },

    async submit(templateId) {
      const payload = await call("submit", () => templateApi.appTemplates.submit(templateId));
      return requireTemplate(payload);
    },

    async listVersions(templateId) {
      const payload = await call("listVersions", () =>
        templateApi.appTemplateVersions.list(templateId, { page: 1, pageSize: VERSION_PAGE_SIZE }));
      return readItems(payload)
        .map(mapVersion)
        .filter((version): version is DeployAppTemplateVersion => version !== undefined);
    },

    async createVersion(templateId, input) {
      const payload = await call("createVersion", () =>
        templateApi.appTemplateVersions.create(
          templateId,
          cleanRecord({
            version: input.version.trim(),
            changelog: input.changelog?.trim() || undefined,
          }),
          idempotencyParams(),
        ));
      const version = mapVersion(payload);
      if (!version) {
        throw new DeployAppTemplateServiceError("unknown", "version response is missing");
      }
      return version;
    },
  };
}

let defaultService: DeployAppTemplateService | null = null;

/** Shared template service backed by the generated Deploy app SDK. */
export function getDeployAppTemplateService(): DeployAppTemplateService {
  if (!defaultService) {
    defaultService = createDeployAppTemplateService(getSdkworkDeploymentsAppSdkClient());
  }
  return defaultService;
}

export function resetDeployAppTemplateService(): void {
  defaultService = null;
}

export function isDeployAppTemplateForbidden(error: unknown): boolean {
  return errorKind(error) === "forbidden" || errorKind(error) === "unauthorized";
}

export function isDeployAppTemplateUnavailable(error: unknown): boolean {
  return errorKind(error) === "unavailable";
}

export function isDeployAppTemplateConflict(error: unknown): boolean {
  return errorKind(error) === "conflict";
}

function errorKind(error: unknown): DeployAppTemplateErrorKind | undefined {
  return error instanceof DeployAppTemplateServiceError ? error.kind : undefined;
}

function call<T>(operation: string, run: () => Promise<T>): Promise<T> {
  return run().catch((error: unknown) => {
    throw normalizeError(operation, error);
  });
}

function normalizeError(operation: string, error: unknown): DeployAppTemplateServiceError {
  if (error instanceof DeployAppTemplateServiceError) {
    return error;
  }
  const record = asRecord(error);
  const status = readNumber(record, "status") ?? readNumber(record, "statusCode");
  const message = readString(record, "message", "detail", "title") || `app template ${operation} failed`;
  if (status === 401) {
    return new DeployAppTemplateServiceError("unauthorized", message, status);
  }
  if (status === 403) {
    return new DeployAppTemplateServiceError("forbidden", message, status);
  }
  if (status === 404 || status === 501) {
    return new DeployAppTemplateServiceError("unavailable", message, status);
  }
  if (status === 409) {
    return new DeployAppTemplateServiceError("conflict", message, status);
  }
  if (status === 400 || status === 422) {
    return new DeployAppTemplateServiceError("validation", message, status);
  }
  return new DeployAppTemplateServiceError("unknown", message, status);
}

function idempotencyParams(): { idempotencyKey: string } {
  return { idempotencyKey: createIdempotencyKey() };
}

function createIdempotencyKey(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  return `tpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function toCreateBody(input: Parameters<DeployAppTemplateService["create"]>[0]): Record<string, unknown> {
  return cleanRecord({
    appUuid: input.appUuid.trim(),
    categoryUuid: input.categoryUuid.trim(),
    templateKey: input.templateKey.trim(),
    displayName: input.displayName.trim(),
    summary: input.summary.trim(),
    description: input.description?.trim() || undefined,
    visibility: input.visibility,
    pricingModel: input.pricingModel,
    priceMinor: input.priceMinor?.trim() || undefined,
    currency: input.currency?.trim().toUpperCase() || undefined,
    iconMediaRef: input.iconMediaRef?.trim() || undefined,
    coverMediaRef: input.coverMediaRef?.trim() || undefined,
    screenshots: input.screenshots && input.screenshots.length > 0 ? input.screenshots : undefined,
  });
}

function toUpdateBody(input: Parameters<DeployAppTemplateService["update"]>[1]): Record<string, unknown> {
  return cleanRecord({
    displayName: input.displayName?.trim(),
    summary: input.summary?.trim(),
    description: input.description,
    categoryUuid: input.categoryUuid?.trim() || undefined,
    visibility: input.visibility,
    pricingModel: input.pricingModel,
    priceMinor: input.priceMinor?.trim() || undefined,
    currency: input.currency?.trim().toUpperCase() || undefined,
    iconMediaRef: input.iconMediaRef?.trim() || undefined,
    coverMediaRef: input.coverMediaRef?.trim() || undefined,
    screenshots: input.screenshots && input.screenshots.length > 0 ? input.screenshots : undefined,
  });
}

function cleanRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  );
}

function requireTemplate(payload: unknown): DeployAppTemplate {
  const template = mapTemplate(payload);
  if (!template) {
    throw new DeployAppTemplateServiceError("unknown", "app template response is missing its id");
  }
  return template;
}

export function mapTemplatePage(payload: unknown): DeployAppTemplatePage {
  const record = asRecord(payload);
  const items = readItems(payload)
    .map(mapTemplate)
    .filter((item): item is DeployAppTemplate => item !== undefined);
  const pageInfo = asRecord(record.pageInfo);
  const total = readNumber(pageInfo, "totalItems") ?? readNumber(pageInfo, "total") ?? items.length;
  return {
    items,
    page: readNumber(pageInfo, "page") ?? 1,
    pageSize: readNumber(pageInfo, "pageSize") ?? (items.length || TEMPLATE_PAGE_SIZE),
    total,
    hasMore: readBoolean(pageInfo, "hasMore") ?? false,
  };
}

export function mapTemplate(value: unknown): DeployAppTemplate | undefined {
  const record = asRecord(value);
  const id = readString(record, "id");
  if (!id) {
    return undefined;
  }
  const status = readString(record, "status").toUpperCase();
  return {
    id,
    templateKey: readString(record, "templateKey") || id,
    displayName: readString(record, "displayName") || id,
    summary: readString(record, "summary"),
    description: readString(record, "description"),
    appUuid: readString(record, "appUuid"),
    templateType: normalizeTemplateType(readString(record, "templateType")),
    categoryUuid: readString(record, "categoryUuid"),
    authorUserId: readString(record, "authorUserId"),
    visibility: readString(record, "visibility").toUpperCase() === "PRIVATE" ? "PRIVATE" : "PUBLIC",
    pricingModel: readString(record, "pricingModel").toUpperCase() === "PAID" ? "PAID" : "FREE",
    priceMinor: readString(record, "priceMinor"),
    currency: readString(record, "currency"),
    status: KNOWN_STATUSES.has(status as DeployAppTemplateStatus)
      ? (status as DeployAppTemplateStatus)
      : "DRAFT",
    ...(readString(record, "reviewNote") ? { reviewNote: readString(record, "reviewNote") } : {}),
    isFeatured: readBoolean(record, "isFeatured") ?? false,
    installCount: readString(record, "installCount") || "0",
    viewCount: readString(record, "viewCount") || "0",
    ...(readString(record, "latestVersionUuid")
      ? { latestVersionUuid: readString(record, "latestVersionUuid") }
      : {}),
    version: readString(record, "version") || "1.0.0",
    ...(readString(record, "iconMediaRef") ? { iconMediaRef: readString(record, "iconMediaRef") } : {}),
    ...(readString(record, "coverMediaRef") ? { coverMediaRef: readString(record, "coverMediaRef") } : {}),
    screenshots: readScreenshots(record.screenshots),
    ...(readString(record, "createdAt") ? { createdAt: readString(record, "createdAt") } : {}),
    ...(readString(record, "updatedAt") ? { updatedAt: readString(record, "updatedAt") } : {}),
  };
}

export function mapCategory(value: unknown): DeployAppTemplateCategory | undefined {
  const record = asRecord(value);
  const id = readString(record, "id", "uuid");
  if (!id) {
    return undefined;
  }
  const rawStatus = readString(record, "status").toUpperCase();
  const status: DeployTemplateCategoryStatus =
    rawStatus === "ACTIVE" ? "ACTIVE" : rawStatus === "DISABLED" ? "DISABLED" : "UNKNOWN";
  return {
    id,
    categoryKey: readString(record, "categoryKey") || id,
    displayName: readString(record, "displayName") || readString(record, "categoryKey") || id,
    ...(readString(record, "description") ? { description: readString(record, "description") } : {}),
    ...(readString(record, "parentId") ? { parentId: readString(record, "parentId") } : {}),
    status,
    ...(readNumber(record, "sortOrder") === undefined ? {} : { sortOrder: readNumber(record, "sortOrder") }),
  };
}

export function mapVersion(value: unknown): DeployAppTemplateVersion | undefined {
  const record = asRecord(value);
  const id = readString(record, "id", "uuid");
  if (!id) {
    return undefined;
  }
  return {
    id,
    templateUuid: readString(record, "templateUuid") || readString(record, "templateId"),
    version: readString(record, "version", "templateVersion") || id,
    status: readString(record, "status") || "DRAFT",
    ...(readString(record, "changelog") ? { changelog: readString(record, "changelog") } : {}),
    ...(readString(record, "createdAt") ? { createdAt: readString(record, "createdAt") } : {}),
  };
}

function mapApp(value: unknown): DeployAppOption | undefined {
  const record = asRecord(value);
  const id = readString(record, "id", "uuid");
  if (!id) {
    return undefined;
  }
  return { id, name: readString(record, "name", "displayName") || id };
}

function normalizeTemplateType(value: string): DeployAppTemplate["templateType"] {
  const normalized = value.toUpperCase();
  return normalized === "PPT" || normalized === "VIDEO" ? normalized : "APP";
}

function readScreenshots(value: unknown): DeployAppTemplate["screenshots"] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      const record = asRecord(entry);
      const mediaRef = readString(record, "mediaRef");
      if (!mediaRef) {
        return undefined;
      }
      return {
        mediaRef,
        ...(readString(record, "device") ? { device: readString(record, "device") } : {}),
        ...(readString(record, "caption") ? { caption: readString(record, "caption") } : {}),
        ...(readNumber(record, "sortOrder") === undefined ? {} : { sortOrder: readNumber(record, "sortOrder") }),
      };
    })
    .filter((entry): entry is DeployAppTemplate["screenshots"][number] => entry !== undefined);
}

function readItems(payload: unknown): readonly unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  const record = asRecord(payload);
  if (Array.isArray(record.items)) {
    return record.items;
  }
  const data = asRecord(record.data);
  return Array.isArray(data.items) ? data.items : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(record: Record<string, unknown>, ...keys: readonly string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return "";
}

function readNumber(record: Record<string, unknown>, ...keys: readonly string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

function readBoolean(record: Record<string, unknown>, ...keys: readonly string[]): boolean | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") {
      return value;
    }
  }
  return undefined;
}

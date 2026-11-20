import { getSdkworkDeploymentsAppSdkClient } from "@sdkwork/cloudroutes-pc-commons/runtime";

import type {
  ApplicationScaffold,
  ApplicationScaffoldPage,
  ApplicationScaffoldService,
  ApplicationScaffoldStatus,
  ApplicationScaffoldVersion,
  DeployAppOption,
  ScaffoldCategory,
  ScaffoldCategoryStatus,
} from "../types/application-scaffolds";

/**
 * Deploy application-scaffold transport seam.
 *
 * Declared structurally so tests can pass a recorder while the default
 * implementation uses the generated `@sdkwork/deployments-app-sdk` client the
 * Cloud Router runtime already provides. The scaffold authoring surface lives
 * on the Deploy app API and the operation names come from
 * `sdks/_route-manifests/app-api/sdkwork-routes-deploy-app-api.route-manifest.json`:
 *
 * - `/app/v3/api/scaffolds` — `scaffolds.list|create|retrieve|update|delete|submit`
 *   (`deploy.scaffolds.read|write`);
 * - `/app/v3/api/scaffolds/{scaffoldUuid}/versions` —
 *   `scaffolds.versions.list|create` (`deploy.scaffolds.read|write`);
 * - `/app/v3/api/scaffold_categories` —
 *   `scaffolds.categories.list` (`deploy.scaffoldCategories.read`);
 * - `/app/v3/api/marketplace/scaffolds` — the browse/install marketplace
 *   (`marketplace.scaffolds.list|retrieve|install`).
 *
 * The free install is the "application factory" entry: a published scaffold is
 * design-time generator input, and installing it creates a new deploy
 * application with its own source snapshot.
 */
export interface ApplicationScaffoldTransport {
  app: {
    list(params?: { page?: number; pageSize?: number }): Promise<unknown>;
    scaffolds: {
      list(params?: {
        page?: number;
        pageSize?: number;
        keyword?: string;
        status?: ApplicationScaffoldStatus;
      }): Promise<unknown>;
      retrieve(scaffoldUuid: string): Promise<unknown>;
      create(body: object, params: { idempotencyKey: string }): Promise<unknown>;
      update(
        scaffoldUuid: string,
        body: object,
        params: { idempotencyKey: string },
      ): Promise<unknown>;
      delete(scaffoldUuid: string): Promise<void>;
      submit(scaffoldUuid: string): Promise<unknown>;
      categories: {
        list(params?: { includeDisabled?: boolean }): Promise<unknown>;
      };
      versions: {
        list(scaffoldUuid: string, params?: { page?: number; pageSize?: number }): Promise<unknown>;
        create(
          scaffoldUuid: string,
          body: object,
          params: { idempotencyKey: string },
        ): Promise<unknown>;
      };
    };
    marketplace: {
      scaffolds: {
        install(
          scaffoldUuid: string,
          body: object,
          params: { idempotencyKey: string },
        ): Promise<unknown>;
      };
    };
  };
}

export type ApplicationScaffoldErrorKind =
  | "unauthorized"
  | "forbidden"
  | "unavailable"
  | "conflict"
  | "validation"
  | "unknown";

/** Normalized failure the scaffold panel and drawers switch on. */
export class ApplicationScaffoldServiceError extends Error {
  readonly kind: ApplicationScaffoldErrorKind;
  readonly status?: number;

  constructor(kind: ApplicationScaffoldErrorKind, message: string, status?: number) {
    super(message);
    this.name = "ApplicationScaffoldServiceError";
    this.kind = kind;
    if (status !== undefined) {
      this.status = status;
    }
  }
}

const SCAFFOLD_PAGE_SIZE = 20;
const VERSION_PAGE_SIZE = 100;
const APP_PAGE_SIZE = 500;
const KNOWN_STATUSES = new Set<ApplicationScaffoldStatus>([
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "REJECTED",
  "DISABLED",
]);

/** Build the scaffold operations on top of one transport. */
export function createApplicationScaffoldService(
  transport: ApplicationScaffoldTransport,
): ApplicationScaffoldService {
  const scaffoldApi = transport.app.scaffolds;

  return {
    async list(input) {
      const payload = await call("list", () =>
        scaffoldApi.list({
          page: input?.page ?? 1,
          pageSize: input?.pageSize ?? SCAFFOLD_PAGE_SIZE,
          ...(input?.keyword ? { keyword: input.keyword } : {}),
          ...(input?.status ? { status: input.status } : {}),
        }));
      return mapScaffoldPage(payload);
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
        scaffoldApi.categories.list({ includeDisabled: true }));
      return readItems(payload)
        .map(mapCategory)
        .filter((category): category is ScaffoldCategory => category !== undefined);
    },

    async create(input) {
      const payload = await call("create", () =>
        scaffoldApi.create(toCreateBody(input), idempotencyParams()));
      return requireScaffold(payload);
    },

    async update(scaffoldId, input) {
      const payload = await call("update", () =>
        scaffoldApi.update(scaffoldId, toUpdateBody(input), idempotencyParams()));
      return requireScaffold(payload);
    },

    async remove(scaffoldId) {
      await call("remove", () => scaffoldApi.delete(scaffoldId));
    },

    async submit(scaffoldId) {
      const payload = await call("submit", () => scaffoldApi.submit(scaffoldId));
      return requireScaffold(payload);
    },

    async listVersions(scaffoldId) {
      const payload = await call("listVersions", () =>
        scaffoldApi.versions.list(scaffoldId, { page: 1, pageSize: VERSION_PAGE_SIZE }));
      return readItems(payload)
        .map(mapScaffoldVersion)
        .filter((version): version is ApplicationScaffoldVersion => version !== undefined);
    },

    async createVersion(scaffoldId, input) {
      const payload = await call("createVersion", () =>
        scaffoldApi.versions.create(
          scaffoldId,
          cleanRecord({
            version: input.version.trim(),
            changelog: input.changelog?.trim() || undefined,
          }),
          idempotencyParams(),
        ));
      const version = mapScaffoldVersion(payload);
      if (!version) {
        throw new ApplicationScaffoldServiceError("unknown", "version response is missing");
      }
      return version;
    },

    async install(scaffoldId, input) {
      const payload = await call("install", () =>
        transport.app.marketplace.scaffolds.install(
          scaffoldId,
          cleanRecord({
            name: input?.name?.trim() || undefined,
            slug: input?.slug?.trim() || undefined,
          }),
          idempotencyParams(),
        ));
      const record = asRecord(payload);
      const app = asRecord(record.app);
      const appId = readString(app, "id");
      if (!appId) {
        throw new ApplicationScaffoldServiceError("unknown", "installed application is missing an id");
      }
      return {
        appId,
        appName: readString(app, "name") || appId,
        scaffoldUuid: readString(record, "scaffoldUuid") || scaffoldId,
      };
    },
  };
}

let defaultService: ApplicationScaffoldService | null = null;

/** Shared scaffold service backed by the generated Deploy app SDK. */
export function getApplicationScaffoldService(): ApplicationScaffoldService {
  if (!defaultService) {
    defaultService = createApplicationScaffoldService(getSdkworkDeploymentsAppSdkClient());
  }
  return defaultService;
}

export function resetApplicationScaffoldService(): void {
  defaultService = null;
}

export function isApplicationScaffoldForbidden(error: unknown): boolean {
  return errorKind(error) === "forbidden" || errorKind(error) === "unauthorized";
}

export function isApplicationScaffoldUnavailable(error: unknown): boolean {
  return errorKind(error) === "unavailable";
}

export function isApplicationScaffoldConflict(error: unknown): boolean {
  return errorKind(error) === "conflict";
}

function errorKind(error: unknown): ApplicationScaffoldErrorKind | undefined {
  return error instanceof ApplicationScaffoldServiceError ? error.kind : undefined;
}

function call<T>(operation: string, run: () => Promise<T>): Promise<T> {
  return run().catch((error: unknown) => {
    throw normalizeError(operation, error);
  });
}

function normalizeError(operation: string, error: unknown): ApplicationScaffoldServiceError {
  if (error instanceof ApplicationScaffoldServiceError) {
    return error;
  }
  const record = asRecord(error);
  const status = readNumber(record, "status") ?? readNumber(record, "statusCode");
  const message = readString(record, "message", "detail", "title") || `application scaffold ${operation} failed`;
  if (status === 401) {
    return new ApplicationScaffoldServiceError("unauthorized", message, status);
  }
  if (status === 403) {
    return new ApplicationScaffoldServiceError("forbidden", message, status);
  }
  if (status === 404 || status === 501) {
    return new ApplicationScaffoldServiceError("unavailable", message, status);
  }
  if (status === 409) {
    return new ApplicationScaffoldServiceError("conflict", message, status);
  }
  if (status === 400 || status === 422) {
    return new ApplicationScaffoldServiceError("validation", message, status);
  }
  return new ApplicationScaffoldServiceError("unknown", message, status);
}

function idempotencyParams(): { idempotencyKey: string } {
  return { idempotencyKey: createIdempotencyKey() };
}

function createIdempotencyKey(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  return `scaffold-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function toCreateBody(input: Parameters<ApplicationScaffoldService["create"]>[0]): Record<string, unknown> {
  return cleanRecord({
    appUuid: input.appUuid.trim(),
    categoryUuid: input.categoryUuid.trim(),
    templateKey: input.scaffoldKey.trim(),
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

function toUpdateBody(input: Parameters<ApplicationScaffoldService["update"]>[1]): Record<string, unknown> {
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

function requireScaffold(payload: unknown): ApplicationScaffold {
  const scaffold = mapScaffold(payload);
  if (!scaffold) {
    throw new ApplicationScaffoldServiceError("unknown", "application scaffold response is missing its id");
  }
  return scaffold;
}

export function mapScaffoldPage(payload: unknown): ApplicationScaffoldPage {
  const record = asRecord(payload);
  const items = readItems(payload)
    .map(mapScaffold)
    .filter((item): item is ApplicationScaffold => item !== undefined);
  const pageInfo = asRecord(record.pageInfo);
  const total = readNumber(pageInfo, "totalItems") ?? readNumber(pageInfo, "total") ?? items.length;
  return {
    items,
    page: readNumber(pageInfo, "page") ?? 1,
    pageSize: readNumber(pageInfo, "pageSize") ?? (items.length || SCAFFOLD_PAGE_SIZE),
    total,
    hasMore: readBoolean(pageInfo, "hasMore") ?? false,
  };
}

export function mapScaffold(value: unknown): ApplicationScaffold | undefined {
  const record = asRecord(value);
  const id = readString(record, "id");
  if (!id) {
    return undefined;
  }
  const status = readString(record, "status").toUpperCase();
  return {
    id,
    // `templateKey`/`templateType` are the database-aligned wire names on
    // `deploy_application_scaffold`; the console exposes scaffold vocabulary.
    scaffoldKey: readString(record, "templateKey", "scaffoldKey") || id,
    displayName: readString(record, "displayName") || id,
    summary: readString(record, "summary"),
    description: readString(record, "description"),
    appUuid: readString(record, "appUuid"),
    scaffoldType: normalizeScaffoldType(readString(record, "templateType", "scaffoldType")),
    categoryUuid: readString(record, "categoryUuid"),
    authorUserId: readString(record, "authorUserId"),
    visibility: readString(record, "visibility").toUpperCase() === "PRIVATE" ? "PRIVATE" : "PUBLIC",
    pricingModel: readString(record, "pricingModel").toUpperCase() === "PAID" ? "PAID" : "FREE",
    priceMinor: readString(record, "priceMinor"),
    currency: readString(record, "currency"),
    status: KNOWN_STATUSES.has(status as ApplicationScaffoldStatus)
      ? (status as ApplicationScaffoldStatus)
      : "DRAFT",
    ...(readString(record, "reviewNote") ? { reviewNote: readString(record, "reviewNote") } : {}),
    isFeatured: readBoolean(record, "isFeatured") ?? false,
    installCount: readString(record, "installCount") || "0",
    viewCount: readString(record, "viewCount") || "0",
    ...(readString(record, "latestVersionUuid")
      ? { latestVersionUuid: readString(record, "latestVersionUuid") }
      : {}),
    version: readString(record, "version") || "1",
    ...(readString(record, "iconMediaRef") ? { iconMediaRef: readString(record, "iconMediaRef") } : {}),
    ...(readString(record, "coverMediaRef") ? { coverMediaRef: readString(record, "coverMediaRef") } : {}),
    screenshots: readScreenshots(record.screenshots),
    ...(readString(record, "createdAt") ? { createdAt: readString(record, "createdAt") } : {}),
    ...(readString(record, "updatedAt") ? { updatedAt: readString(record, "updatedAt") } : {}),
  };
}

export function mapCategory(value: unknown): ScaffoldCategory | undefined {
  const record = asRecord(value);
  const id = readString(record, "id", "uuid");
  if (!id) {
    return undefined;
  }
  const rawStatus = readString(record, "status").toUpperCase();
  const status: ScaffoldCategoryStatus =
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

export function mapScaffoldVersion(value: unknown): ApplicationScaffoldVersion | undefined {
  const record = asRecord(value);
  const id = readString(record, "id", "uuid");
  if (!id) {
    return undefined;
  }
  return {
    id,
    scaffoldUuid: readString(record, "scaffoldUuid", "templateUuid"),
    // `templateVersion` is the database-aligned semantic version the drawer
    // renders; the wire `version` field is the record's optimistic-lock
    // revision, so it is only a fallback when the semantic field is absent.
    version: readString(record, "templateVersion", "version") || id,
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

function normalizeScaffoldType(value: string): ApplicationScaffold["scaffoldType"] {
  const normalized = value.toUpperCase();
  return normalized === "PPT" || normalized === "VIDEO" ? normalized : "APP";
}

function readScreenshots(value: unknown): ApplicationScaffold["screenshots"] {
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
    .filter((entry): entry is ApplicationScaffold["screenshots"][number] => entry !== undefined);
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

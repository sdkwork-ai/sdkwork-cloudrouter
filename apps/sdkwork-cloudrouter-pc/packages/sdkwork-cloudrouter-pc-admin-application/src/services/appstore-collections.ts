import { getSdkworkAppstoreBackendSdkClient } from "@sdkwork/cloudroutes-pc-commons/runtime";

import type {
  AppStoreCollection,
  AppStoreCollectionCreateInput,
  AppStoreCollectionItemInput,
  AppStoreCollectionPage,
  AppStoreCollectionQuery,
  AppStoreCollectionService,
  AppStoreCollectionUpdateInput,
} from "../types/appstore-collections";

/** App Store collection transport seam (structural for test doubles). */
export interface AppStoreCollectionTransport {
  catalog: {
    appstore: {
      catalog: {
        admin: {
          collections: {
            list(params?: { cursor?: string; pageSize?: number }): Promise<unknown>;
          };
        };
        collections: {
          create(body: Record<string, unknown>): Promise<unknown>;
          update(collectionId: string, body: Record<string, unknown>): Promise<unknown>;
          items: {
            update(collectionId: string, body: Record<string, unknown>): Promise<unknown>;
          };
        };
      };
    };
  };
}

export type AppStoreCollectionErrorKind =
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "unavailable"
  | "validation"
  | "unknown";

export class AppStoreCollectionServiceError extends Error {
  readonly kind: AppStoreCollectionErrorKind;
  readonly status?: number;

  constructor(kind: AppStoreCollectionErrorKind, message: string, status?: number) {
    super(message);
    this.name = "AppStoreCollectionServiceError";
    this.kind = kind;
    if (status !== undefined) {
      this.status = status;
    }
  }
}

export const COLLECTION_CODE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/;

const PAGE_SIZE = 50;

export function createAppStoreCollectionService(
  transport: AppStoreCollectionTransport,
): AppStoreCollectionService {
  const catalog = transport.catalog.appstore.catalog;

  return {
    async list(query) {
      const payload = await call("list", () =>
        catalog.admin.collections.list({
          ...(query?.cursor ? { cursor: query.cursor } : {}),
          pageSize: query?.pageSize ?? PAGE_SIZE,
        }),
      );
      return mapCollectionPage(payload);
    },

    async create(input) {
      const code = input.collectionCode.trim();
      if (!COLLECTION_CODE_PATTERN.test(code)) {
        throw new AppStoreCollectionServiceError("validation", "invalid collection code");
      }
      if (!input.collectionType.trim()) {
        throw new AppStoreCollectionServiceError("validation", "collectionType is required");
      }
      const payload = await call("create", () =>
        catalog.collections.create({
          collectionCode: code,
          collectionType: input.collectionType.trim(),
          ...(input.audienceScope?.trim() ? { audienceScope: input.audienceScope.trim() } : {}),
        }),
      );
      return readCreatedId(payload);
    },

    async update(collectionId, input) {
      if (!collectionId.trim()) {
        throw new AppStoreCollectionServiceError("validation", "collectionId is required");
      }
      await call("update", () =>
        catalog.collections.update(collectionId, {
          ...(input.collectionStatus?.trim() ? { collectionStatus: input.collectionStatus.trim() } : {}),
          ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
        }),
      );
    },

    async replaceItems(collectionId, items) {
      if (!collectionId.trim()) {
        throw new AppStoreCollectionServiceError("validation", "collectionId is required");
      }
      const normalized = items
        .map((item, index) => ({
          listingId: item.listingId.trim(),
          sortOrder: item.sortOrder ?? index,
        }))
        .filter((item) => item.listingId.length > 0);
      await call("items.update", () =>
        catalog.collections.items.update(collectionId, { items: normalized }),
      );
    },
  };
}

let defaultService: AppStoreCollectionService | null = null;

export function getAppStoreCollectionService(): AppStoreCollectionService {
  if (!defaultService) {
    defaultService = createAppStoreCollectionService(
      getSdkworkAppstoreBackendSdkClient() as unknown as AppStoreCollectionTransport,
    );
  }
  return defaultService;
}

export function resetAppStoreCollectionService(): void {
  defaultService = null;
}

export function isAppStoreCollectionForbidden(error: unknown): boolean {
  return error instanceof AppStoreCollectionServiceError
    && (error.kind === "forbidden" || error.kind === "unauthorized");
}

export function isAppStoreCollectionUnavailable(error: unknown): boolean {
  return error instanceof AppStoreCollectionServiceError
    && (error.kind === "unavailable" || error.kind === "unknown");
}

function mapCollectionPage(payload: unknown): AppStoreCollectionPage {
  const record = asRecord(payload);
  const data = asRecord(record.data);
  const items = Array.isArray(record.items)
    ? record.items
    : Array.isArray(data.items)
      ? data.items
      : [];
  const pageInfo = asRecord(record.pageInfo ?? data.pageInfo);
  const nextCursor = readString(pageInfo.nextCursor ?? pageInfo.next_cursor);
  const hasMore = readBoolean(pageInfo.hasMore ?? pageInfo.has_more) ?? Boolean(nextCursor);
  const total = readNumber(pageInfo.totalItems ?? pageInfo.total_items);
  return {
    items: items
      .map((item) => mapCollection(item))
      .filter((item): item is AppStoreCollection => item !== undefined),
    hasMore,
    ...(nextCursor ? { nextCursor } : {}),
    ...(total === undefined ? {} : { total }),
  };
}

function mapCollection(value: unknown): AppStoreCollection | undefined {
  const record = asRecord(value);
  const collectionId = readString(record.collectionId ?? record.collection_id ?? record.id);
  if (!collectionId) {
    return undefined;
  }
  const collectionCode = readString(record.collectionCode ?? record.collection_code);
  const collectionType = readString(record.collectionType ?? record.collection_type);
  const audienceScope = readString(record.audienceScope ?? record.audience_scope);
  const status = readString(record.status ?? record.collectionStatus ?? record.collection_status);
  const displayName = readString(record.displayName ?? record.display_name);
  const sortOrder = readNumber(record.sortOrder ?? record.sort_order);
  const itemCount = readNumber(record.itemCount ?? record.item_count ?? record.itemsCount ?? record.items_count);
  return {
    collectionId,
    collectionCode: collectionCode ?? collectionId,
    ...(collectionType ? { collectionType } : {}),
    ...(audienceScope ? { audienceScope } : {}),
    ...(status ? { status } : {}),
    ...(sortOrder === undefined ? {} : { sortOrder }),
    ...(displayName ? { displayName } : {}),
    ...(itemCount === undefined ? {} : { itemCount }),
  };
}

function readCreatedId(payload: unknown): string | undefined {
  const record = asRecord(payload);
  const data = asRecord(record.data);
  const item = asRecord(record.item ?? data.item);
  return readString(item.collectionId ?? item.collection_id ?? item.id)
    ?? readString(record.resourceId ?? record.resource_id);
}

async function call<T>(operation: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const record = asRecord(error);
    const status = readNumber(record.status ?? record.statusCode ?? record.status_code);
    const detail = readString(record.detail ?? record.message) ?? `${operation} failed`;
    if (status === 401) {
      throw new AppStoreCollectionServiceError("unauthorized", detail, status);
    }
    if (status === 403) {
      throw new AppStoreCollectionServiceError("forbidden", detail, status);
    }
    if (status === 404) {
      throw new AppStoreCollectionServiceError("not-found", detail, status);
    }
    if (status === 409) {
      throw new AppStoreCollectionServiceError("conflict", detail, status);
    }
    if (status === 400 || status === 422) {
      throw new AppStoreCollectionServiceError("validation", detail, status);
    }
    if (status === 429 || status === 502 || status === 503 || status === 504) {
      throw new AppStoreCollectionServiceError("unavailable", detail, status);
    }
    throw new AppStoreCollectionServiceError("unknown", detail, status);
  }
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

import { getSdkworkAppstoreBackendSdkClient } from "@sdkwork/cloudroutes-pc-commons/runtime";

import type {
  AppStoreListing,
  AppStoreListingPage,
  AppStoreListingQuery,
  AppStoreListingService,
  AppStoreListingVisibilityInput,
} from "../types/appstore-listings";

/** App Store listing transport seam (structural for test doubles). */
export interface AppStoreListingTransport {
  listings: {
    appstore: {
      listings: {
        admin: {
          list(params?: {
            statusFilter?: string;
            reviewStatusFilter?: string;
            cursor?: string;
            pageSize?: number;
          }): Promise<unknown>;
          retrieve(listingId: string): Promise<unknown>;
          visibility: {
            update(listingId: string, body: Record<string, unknown>): Promise<unknown>;
          };
        };
      };
    };
  };
}

export type AppStoreListingErrorKind =
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "unavailable"
  | "validation"
  | "unknown";

export class AppStoreListingServiceError extends Error {
  readonly kind: AppStoreListingErrorKind;
  readonly status?: number;

  constructor(kind: AppStoreListingErrorKind, message: string, status?: number) {
    super(message);
    this.name = "AppStoreListingServiceError";
    this.kind = kind;
    if (status !== undefined) {
      this.status = status;
    }
  }
}

const PAGE_SIZE = 50;
const VISIBILITY_STATES = new Set(["VISIBLE", "HIDDEN", "DELISTED", "REGION_RESTRICTED"]);

export function createAppStoreListingService(
  transport: AppStoreListingTransport,
): AppStoreListingService {
  const admin = transport.listings.appstore.listings.admin;

  return {
    async list(query) {
      const payload = await call("list", () =>
        admin.list({
          ...(query?.statusFilter ? { statusFilter: query.statusFilter } : {}),
          ...(query?.reviewStatusFilter ? { reviewStatusFilter: query.reviewStatusFilter } : {}),
          ...(query?.cursor ? { cursor: query.cursor } : {}),
          pageSize: query?.pageSize ?? PAGE_SIZE,
        }),
      );
      return mapListingPage(payload);
    },

    async updateVisibility(listingId, input) {
      if (!listingId.trim()) {
        throw new AppStoreListingServiceError("validation", "listingId is required");
      }
      if (!VISIBILITY_STATES.has(input.storefrontVisibility)) {
        throw new AppStoreListingServiceError("validation", "unsupported visibility state");
      }
      await call("visibility.update", () =>
        admin.visibility.update(listingId, {
          storefrontVisibility: input.storefrontVisibility,
          ...(input.reason?.trim() ? { reason: input.reason.trim() } : {}),
        }),
      );
    },

    async getListing(listingId) {
      if (!listingId.trim()) {
        throw new AppStoreListingServiceError("validation", "listingId is required");
      }
      const payload = await call("retrieve", () => admin.retrieve(listingId));
      const record = asRecord(payload);
      const data = asRecord(record.data);
      const item = asRecord(record.item ?? data.item);
      const source = Object.keys(item).length > 0 ? item : data;
      if (Object.keys(source).length === 0) {
        return undefined;
      }
      const base = mapListing({ ...source, listingId: source.listingId ?? source.listing_id ?? listingId });
      return base ? { ...base, attributes: source } : undefined;
    },
  };
}

let defaultService: AppStoreListingService | null = null;

export function getAppStoreListingService(): AppStoreListingService {
  if (!defaultService) {
    defaultService = createAppStoreListingService(
      getSdkworkAppstoreBackendSdkClient() as unknown as AppStoreListingTransport,
    );
  }
  return defaultService;
}

export function resetAppStoreListingService(): void {
  defaultService = null;
}

export function isAppStoreListingForbidden(error: unknown): boolean {
  return error instanceof AppStoreListingServiceError
    && (error.kind === "forbidden" || error.kind === "unauthorized");
}

export function isAppStoreListingUnavailable(error: unknown): boolean {
  return error instanceof AppStoreListingServiceError
    && (error.kind === "unavailable" || error.kind === "unknown");
}

function mapListingPage(payload: unknown): AppStoreListingPage {
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
      .map((item) => mapListing(item))
      .filter((item): item is AppStoreListing => item !== undefined),
    hasMore,
    ...(nextCursor ? { nextCursor } : {}),
    ...(total === undefined ? {} : { total }),
  };
}

function mapListing(value: unknown): AppStoreListing | undefined {
  const record = asRecord(value);
  const listingId = readString(record.listingId ?? record.listing_id ?? record.id);
  if (!listingId) {
    return undefined;
  }
  const displayName = readString(record.displayName ?? record.display_name ?? record.name ?? record.title);
  const listingCode = readString(record.listingCode ?? record.listing_code ?? record.code);
  const publisherId = readString(record.publisherId ?? record.publisher_id);
  const publisherName = readString(
    record.publisherName ?? record.publisher_name ?? record.developerName ?? record.developer_name,
  );
  const listingStatus = readString(record.listingStatus ?? record.listing_status ?? record.status);
  const storefrontVisibility = readString(
    record.storefrontVisibility ?? record.storefront_visibility ?? record.visibility,
  );
  const categoryCode = readString(record.categoryCode ?? record.category_code ?? record.category);
  const platform = readString(record.platform ?? record.platformCode ?? record.platform_code);
  const latestReleaseVersion = readString(
    record.latestReleaseVersion ?? record.latest_release_version ?? record.version,
  );
  const updatedAt = readString(record.updatedAt ?? record.updated_at);
  return {
    listingId,
    ...(listingCode ? { listingCode } : {}),
    displayName: displayName ?? listingCode ?? listingId,
    ...(publisherId ? { publisherId } : {}),
    ...(publisherName ? { publisherName } : {}),
    listingStatus: normalizeToken(listingStatus, "UNKNOWN"),
    ...(storefrontVisibility ? { storefrontVisibility: normalizeToken(storefrontVisibility) } : {}),
    ...(categoryCode ? { categoryCode } : {}),
    ...(platform ? { platform } : {}),
    ...(latestReleaseVersion ? { latestReleaseVersion } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

async function call<T>(operation: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const record = asRecord(error);
    const status = readNumber(record.status ?? record.statusCode ?? record.status_code);
    const detail = readString(record.detail ?? record.message) ?? `${operation} failed`;
    if (status === 401) {
      throw new AppStoreListingServiceError("unauthorized", detail, status);
    }
    if (status === 403) {
      throw new AppStoreListingServiceError("forbidden", detail, status);
    }
    if (status === 404) {
      throw new AppStoreListingServiceError("not-found", detail, status);
    }
    if (status === 409) {
      throw new AppStoreListingServiceError("conflict", detail, status);
    }
    if (status === 400 || status === 422) {
      throw new AppStoreListingServiceError("validation", detail, status);
    }
    if (status === 429 || status === 502 || status === 503 || status === 504) {
      throw new AppStoreListingServiceError("unavailable", detail, status);
    }
    throw new AppStoreListingServiceError("unknown", detail, status);
  }
}

function normalizeToken(value: string | undefined, fallback = ""): string {
  return value?.trim().toUpperCase() || fallback;
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

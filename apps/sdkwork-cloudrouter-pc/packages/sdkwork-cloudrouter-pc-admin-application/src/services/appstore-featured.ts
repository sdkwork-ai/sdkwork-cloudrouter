import { getSdkworkAppstoreBackendSdkClient } from "@sdkwork/cloudroutes-pc-commons/runtime";

import type {
  AppStoreFeaturedSlot,
  AppStoreFeaturedSlotInput,
  AppStoreFeaturedSlotPage,
  AppStoreFeaturedSlotService,
  AppStoreFeaturedSlotStatus,
} from "../types/appstore-featured";

/** App Store featured-slot transport seam (structural for test doubles). */
export interface AppStoreFeaturedSlotTransport {
  catalog: {
    appstore: {
      catalog: {
        admin: {
          featured: {
            list(): Promise<unknown>;
          };
        };
        featured: {
          update(slotCode: string, body: Record<string, unknown>): Promise<unknown>;
        };
      };
    };
  };
}

export type AppStoreFeaturedSlotErrorKind =
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "unavailable"
  | "validation"
  | "unknown";

export class AppStoreFeaturedSlotServiceError extends Error {
  readonly kind: AppStoreFeaturedSlotErrorKind;
  readonly status?: number;

  constructor(kind: AppStoreFeaturedSlotErrorKind, message: string, status?: number) {
    super(message);
    this.name = "AppStoreFeaturedSlotServiceError";
    this.kind = kind;
    if (status !== undefined) {
      this.status = status;
    }
  }
}

const SLOT_STATUSES = new Set<AppStoreFeaturedSlotStatus>(["SCHEDULED", "ACTIVE", "ENDED"]);

export function createAppStoreFeaturedSlotService(
  transport: AppStoreFeaturedSlotTransport,
): AppStoreFeaturedSlotService {
  const catalog = transport.catalog.appstore.catalog;

  return {
    async list() {
      const payload = await call("list", () => catalog.admin.featured.list());
      return mapFeaturedPage(payload);
    },

    async update(slotCode, input) {
      if (!slotCode.trim()) {
        throw new AppStoreFeaturedSlotServiceError("validation", "slotCode is required");
      }
      if (!input.listingId.trim()) {
        throw new AppStoreFeaturedSlotServiceError("validation", "listingId is required");
      }
      const startsAt = normalizeInstant(input.startsAt);
      const endsAt = normalizeInstant(input.endsAt);
      if (!startsAt || !endsAt) {
        throw new AppStoreFeaturedSlotServiceError("validation", "a valid window is required");
      }
      if (new Date(startsAt).getTime() >= new Date(endsAt).getTime()) {
        throw new AppStoreFeaturedSlotServiceError("validation", "the window must end after it starts");
      }
      await call("update", () =>
        catalog.featured.update(slotCode, {
          listingId: input.listingId.trim(),
          startsAt,
          endsAt,
          ...(input.slotStatus && SLOT_STATUSES.has(input.slotStatus)
            ? { slotStatus: input.slotStatus }
            : {}),
        }),
      );
    },
  };
}

let defaultService: AppStoreFeaturedSlotService | null = null;

export function getAppStoreFeaturedSlotService(): AppStoreFeaturedSlotService {
  if (!defaultService) {
    defaultService = createAppStoreFeaturedSlotService(
      getSdkworkAppstoreBackendSdkClient() as unknown as AppStoreFeaturedSlotTransport,
    );
  }
  return defaultService;
}

export function resetAppStoreFeaturedSlotService(): void {
  defaultService = null;
}

export function isAppStoreFeaturedSlotForbidden(error: unknown): boolean {
  return error instanceof AppStoreFeaturedSlotServiceError
    && (error.kind === "forbidden" || error.kind === "unauthorized");
}

export function isAppStoreFeaturedSlotUnavailable(error: unknown): boolean {
  return error instanceof AppStoreFeaturedSlotServiceError
    && (error.kind === "unavailable" || error.kind === "unknown");
}

/** Accept either an ISO instant or a `datetime-local` value. */
export function normalizeInstant(value: string): string | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function mapFeaturedPage(payload: unknown): AppStoreFeaturedSlotPage {
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
  return {
    items: items
      .map((item) => mapFeaturedSlot(item))
      .filter((item): item is AppStoreFeaturedSlot => item !== undefined),
    hasMore,
    ...(nextCursor ? { nextCursor } : {}),
  };
}

function mapFeaturedSlot(value: unknown): AppStoreFeaturedSlot | undefined {
  const record = asRecord(value);
  const slotCode = readString(record.slotCode ?? record.slot_code);
  const listingId = readString(record.listingId ?? record.listing_id);
  if (!slotCode && !listingId) {
    return undefined;
  }
  const status = readString(record.status);
  const audienceScope = readString(record.audienceScope ?? record.audience_scope);
  const platformScope = readString(record.platformScope ?? record.platform_scope);
  const startsAt = readString(record.startsAt ?? record.starts_at);
  const endsAt = readString(record.endsAt ?? record.ends_at);
  return {
    slotCode: slotCode ?? listingId ?? "",
    listingId: listingId ?? "",
    ...(status ? { status } : {}),
    ...(audienceScope ? { audienceScope } : {}),
    ...(platformScope ? { platformScope } : {}),
    ...(startsAt ? { startsAt } : {}),
    ...(endsAt ? { endsAt } : {}),
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
      throw new AppStoreFeaturedSlotServiceError("unauthorized", detail, status);
    }
    if (status === 403) {
      throw new AppStoreFeaturedSlotServiceError("forbidden", detail, status);
    }
    if (status === 404) {
      throw new AppStoreFeaturedSlotServiceError("not-found", detail, status);
    }
    if (status === 409) {
      throw new AppStoreFeaturedSlotServiceError("conflict", detail, status);
    }
    if (status === 400 || status === 422) {
      throw new AppStoreFeaturedSlotServiceError("validation", detail, status);
    }
    if (status === 429 || status === 502 || status === 503 || status === 504) {
      throw new AppStoreFeaturedSlotServiceError("unavailable", detail, status);
    }
    throw new AppStoreFeaturedSlotServiceError("unknown", detail, status);
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

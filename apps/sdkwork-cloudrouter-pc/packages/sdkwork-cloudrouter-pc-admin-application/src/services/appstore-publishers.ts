import { getSdkworkAppstoreBackendSdkClient } from "@sdkwork/cloudroutes-pc-commons/runtime";

import type {
  AppStorePublisher,
  AppStorePublisherPage,
  AppStorePublisherQuery,
  AppStorePublisherService,
  AppStorePublisherVerifyInput,
} from "../types/appstore-publishers";

/** App Store publisher transport seam (structural for test doubles). */
export interface AppStorePublisherTransport {
  publishers: {
    appstore: {
      publishers: {
        admin: {
          list(params?: { cursor?: string; pageSize?: number }): Promise<unknown>;
          verify(publisherId: string, body: Record<string, unknown>): Promise<unknown>;
        };
      };
    };
  };
}

export type AppStorePublisherErrorKind =
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "unavailable"
  | "validation"
  | "unknown";

export class AppStorePublisherServiceError extends Error {
  readonly kind: AppStorePublisherErrorKind;
  readonly status?: number;

  constructor(kind: AppStorePublisherErrorKind, message: string, status?: number) {
    super(message);
    this.name = "AppStorePublisherServiceError";
    this.kind = kind;
    if (status !== undefined) {
      this.status = status;
    }
  }
}

const PAGE_SIZE = 50;

export function createAppStorePublisherService(
  transport: AppStorePublisherTransport,
): AppStorePublisherService {
  const admin = transport.publishers.appstore.publishers.admin;

  return {
    async list(query) {
      const payload = await call("list", () =>
        admin.list({
          ...(query?.cursor ? { cursor: query.cursor } : {}),
          pageSize: query?.pageSize ?? PAGE_SIZE,
        }),
      );
      return mapPublisherPage(payload);
    },

    async verify(publisherId, input) {
      if (!publisherId.trim()) {
        throw new AppStorePublisherServiceError("validation", "publisherId is required");
      }
      await call("verify", () =>
        admin.verify(publisherId, {
          verificationType: input.verificationType,
          decision: input.decision,
        }),
      );
    },
  };
}

let defaultService: AppStorePublisherService | null = null;

export function getAppStorePublisherService(): AppStorePublisherService {
  if (!defaultService) {
    defaultService = createAppStorePublisherService(
      getSdkworkAppstoreBackendSdkClient() as unknown as AppStorePublisherTransport,
    );
  }
  return defaultService;
}

export function resetAppStorePublisherService(): void {
  defaultService = null;
}

export function isAppStorePublisherForbidden(error: unknown): boolean {
  return error instanceof AppStorePublisherServiceError
    && (error.kind === "forbidden" || error.kind === "unauthorized");
}

export function isAppStorePublisherUnavailable(error: unknown): boolean {
  return error instanceof AppStorePublisherServiceError
    && (error.kind === "unavailable" || error.kind === "unknown");
}

function mapPublisherPage(payload: unknown): AppStorePublisherPage {
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
      .map((item) => mapPublisher(item))
      .filter((item): item is AppStorePublisher => item !== undefined),
    hasMore,
    ...(nextCursor ? { nextCursor } : {}),
    ...(total === undefined ? {} : { total }),
  };
}

function mapPublisher(value: unknown): AppStorePublisher | undefined {
  const record = asRecord(value);
  const publisherId = readString(record.id ?? record.publisherId ?? record.publisher_id);
  if (!publisherId) {
    return undefined;
  }
  const displayName = readString(record.displayName ?? record.display_name);
  const publisherType = readString(record.publisherType ?? record.publisher_type);
  const status = readString(record.status);
  const verificationStatus = readString(record.verificationStatus ?? record.verification_status);
  const supportEmail = readString(record.supportEmail ?? record.support_email);
  const websiteUrl = readString(record.websiteUrl ?? record.website_url);
  const createdAt = readString(record.createdAt ?? record.created_at);
  return {
    publisherId,
    displayName: displayName ?? publisherId,
    ...(publisherType ? { publisherType } : {}),
    ...(status ? { status } : {}),
    ...(verificationStatus ? { verificationStatus } : {}),
    ...(supportEmail ? { supportEmail } : {}),
    ...(websiteUrl ? { websiteUrl } : {}),
    ...(createdAt ? { createdAt } : {}),
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
      throw new AppStorePublisherServiceError("unauthorized", detail, status);
    }
    if (status === 403) {
      throw new AppStorePublisherServiceError("forbidden", detail, status);
    }
    if (status === 404) {
      throw new AppStorePublisherServiceError("not-found", detail, status);
    }
    if (status === 409) {
      throw new AppStorePublisherServiceError("conflict", detail, status);
    }
    if (status === 400 || status === 422) {
      throw new AppStorePublisherServiceError("validation", detail, status);
    }
    if (status === 429 || status === 502 || status === 503 || status === 504) {
      throw new AppStorePublisherServiceError("unavailable", detail, status);
    }
    throw new AppStorePublisherServiceError("unknown", detail, status);
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

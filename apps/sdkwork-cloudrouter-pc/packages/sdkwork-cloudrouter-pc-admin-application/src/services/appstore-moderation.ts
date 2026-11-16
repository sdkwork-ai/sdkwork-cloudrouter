import { getSdkworkAppstoreBackendSdkClient } from "@sdkwork/cloudroutes-pc-commons/runtime";

import type {
  AppStoreModerationAppeal,
  AppStoreModerationAppealPage,
  AppStoreModerationDecisionInput,
  AppStoreModerationPage,
  AppStoreModerationQueueItem,
  AppStoreModerationQueueQuery,
  AppStoreModerationService,
} from "../types/appstore-moderation";

/**
 * App Store moderation transport seam.
 *
 * Declared structurally so tests can pass a plain recorder while the default
 * implementation passes the generated `@sdkwork/appstore-backend-sdk` client.
 */
export interface AppStoreModerationTransport {
  moderation: {
    appstore: {
      moderation: {
        queue: {
          list(params?: { reviewStatus?: string; cursor?: string; pageSize?: number }): Promise<unknown>;
        };
        decisions: {
          create(
            reviewId: string,
            body: Record<string, unknown>,
            params: { idempotencyKey: string },
          ): Promise<unknown>;
        };
        reviews: {
          assign(reviewId: string, body: Record<string, unknown>): Promise<unknown>;
          retrieve(reviewId: string): Promise<unknown>;
        };
        appeals: {
          list(params?: { status?: string; cursor?: string; pageSize?: number }): Promise<unknown>;
          decide(appealId: string, body: Record<string, unknown>): Promise<unknown>;
        };
      };
    };
  };
}

export type AppStoreModerationErrorKind =
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "unavailable"
  | "validation"
  | "unknown";

/** Normalized failure the queue and decision dialog switch on. */
export class AppStoreModerationServiceError extends Error {
  readonly kind: AppStoreModerationErrorKind;
  readonly status?: number;

  constructor(kind: AppStoreModerationErrorKind, message: string, status?: number) {
    super(message);
    this.name = "AppStoreModerationServiceError";
    this.kind = kind;
    if (status !== undefined) {
      this.status = status;
    }
  }
}

const QUEUE_PAGE_SIZE = 50;

/** Build moderation operations on top of one transport. */
export function createAppStoreModerationService(
  transport: AppStoreModerationTransport,
): AppStoreModerationService {
  const moderation = transport.moderation.appstore.moderation;

  return {
    async listQueue(query) {
      const payload = await callModerationOperation("listQueue", () =>
        moderation.queue.list({
          ...(query?.reviewStatus ? { reviewStatus: query.reviewStatus } : {}),
          ...(query?.cursor ? { cursor: query.cursor } : {}),
          pageSize: query?.pageSize ?? QUEUE_PAGE_SIZE,
        }),
      );
      return mapQueuePage(payload);
    },

    async decide(reviewId, input) {
      if (!reviewId.trim()) {
        throw new AppStoreModerationServiceError("validation", "reviewId is required");
      }
      const reasonDetail = input.reasonDetail?.trim();
      if (input.decisionType !== "APPROVE" && !reasonDetail) {
        throw new AppStoreModerationServiceError("validation", "a reason is required");
      }
      await callModerationOperation("decide", () =>
        moderation.decisions.create(
          reviewId,
          {
            decisionType: input.decisionType,
            decisionStatus: "FINAL",
            ...(input.reasonCode?.trim() ? { reasonCode: input.reasonCode.trim() } : {}),
            ...(reasonDetail ? { reasonDetail } : {}),
          },
          { idempotencyKey: createIdempotencyKey() },
        ),
      );
    },

    async assign(reviewId, assignedTo) {
      if (!reviewId.trim() || !assignedTo.trim()) {
        throw new AppStoreModerationServiceError("validation", "reviewId and assignedTo are required");
      }
      await callModerationOperation("assign", () =>
        moderation.reviews.assign(reviewId, { assignedTo: assignedTo.trim() }),
      );
    },

    async getReview(reviewId) {
      if (!reviewId.trim()) {
        throw new AppStoreModerationServiceError("validation", "reviewId is required");
      }
      const payload = await callModerationOperation("reviews.retrieve", () =>
        moderation.reviews.retrieve(reviewId),
      );
      const record = asRecord(payload);
      const data = asRecord(record.data);
      const item = asRecord(record.item ?? data.item);
      const source = Object.keys(item).length > 0 ? item : data;
      if (Object.keys(source).length === 0) {
        return undefined;
      }
      const base = mapQueueItem({ ...source, reviewId: source.reviewId ?? source.review_id ?? reviewId });
      return base
        ? {
          ...base,
          attributes: source,
          ...(readString(source.updatedAt ?? source.updated_at)
            ? { updatedAt: readString(source.updatedAt ?? source.updated_at) }
            : {}),
        }
        : undefined;
    },

    async listAppeals(query) {
      const payload = await callModerationOperation("appeals.list", () =>
        moderation.appeals.list({
          ...(query?.status ? { status: query.status } : {}),
          ...(query?.cursor ? { cursor: query.cursor } : {}),
          pageSize: query?.pageSize ?? QUEUE_PAGE_SIZE,
        }),
      );
      return mapAppealPage(payload);
    },

    async decideAppeal(appealId, input) {
      if (!appealId.trim() || !input.note.trim()) {
        throw new AppStoreModerationServiceError("validation", "appealId and note are required");
      }
      await callModerationOperation("appeals.decide", () =>
        moderation.appeals.decide(appealId, { decision: input.decision, note: input.note.trim() }),
      );
    },
  };
}

let defaultService: AppStoreModerationService | null = null;

/** Shared moderation service backed by the generated App Store backend SDK. */
export function getAppStoreModerationService(): AppStoreModerationService {
  if (!defaultService) {
    defaultService = createAppStoreModerationService(
      getSdkworkAppstoreBackendSdkClient() as unknown as AppStoreModerationTransport,
    );
  }
  return defaultService;
}

/** Drop the cached default service (session/account switches). */
export function resetAppStoreModerationService(): void {
  defaultService = null;
}

export function isAppStoreModerationForbidden(error: unknown): boolean {
  return error instanceof AppStoreModerationServiceError
    && (error.kind === "forbidden" || error.kind === "unauthorized");
}

export function isAppStoreModerationUnavailable(error: unknown): boolean {
  return error instanceof AppStoreModerationServiceError
    && (error.kind === "unavailable" || error.kind === "unknown");
}

function mapQueuePage(payload: unknown): AppStoreModerationPage {
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
      .map((item) => mapQueueItem(item))
      .filter((item): item is AppStoreModerationQueueItem => item !== undefined),
    hasMore,
    ...(nextCursor ? { nextCursor } : {}),
    ...(total === undefined ? {} : { total }),
  };
}

function mapAppealPage(payload: unknown): AppStoreModerationAppealPage {
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
      .map((item) => mapAppeal(item))
      .filter((item): item is AppStoreModerationAppeal => item !== undefined),
    hasMore,
    ...(nextCursor ? { nextCursor } : {}),
    ...(total === undefined ? {} : { total }),
  };
}

function mapAppeal(value: unknown): AppStoreModerationAppeal | undefined {
  const record = asRecord(value);
  const appealId = readString(record.appealId ?? record.appeal_id ?? record.id);
  if (!appealId) {
    return undefined;
  }
  const reviewId = readString(record.reviewId ?? record.review_id);
  const listingId = readString(record.listingId ?? record.listing_id);
  const listingName = readString(record.listingName ?? record.listing_name);
  const decision = readString(record.decision);
  const note = readString(record.note);
  const submittedAt = readString(record.submittedAt ?? record.submitted_at ?? record.createdAt ?? record.created_at);
  const decidedAt = readString(record.decidedAt ?? record.decided_at);
  return {
    appealId,
    ...(reviewId ? { reviewId } : {}),
    ...(listingId ? { listingId } : {}),
    ...(listingName ? { listingName } : {}),
    appealStatus: normalizeToken(readString(record.appealStatus ?? record.appeal_status ?? record.status), "PENDING"),
    appealReason: readString(record.appealReason ?? record.appeal_reason ?? record.reason) ?? "",
    ...(decision ? { decision: normalizeToken(decision, "UNKNOWN") } : {}),
    ...(note ? { note } : {}),
    ...(submittedAt ? { submittedAt } : {}),
    ...(decidedAt ? { decidedAt } : {}),
  };
}

function mapQueueItem(value: unknown): AppStoreModerationQueueItem | undefined {  const record = asRecord(value);
  const reviewId = readString(record.reviewId ?? record.review_id ?? record.id);
  if (!reviewId) {
    return undefined;
  }
  const listingId = readString(record.listingId ?? record.listing_id);
  const listingName = readString(
    record.listingName ?? record.listing_name ?? record.displayName ?? record.display_name,
  );
  const assignedTo = readString(
    record.assignedTo ?? record.assigned_to ?? record.assigneeId ?? record.assignee_id,
  );
  const submittedAt = readString(
    record.submittedAt ?? record.submitted_at ?? record.createdAt ?? record.created_at,
  );
  const priority = readNumber(record.priority ?? record.queuePriority ?? record.queue_priority);
  return {
    reviewId,
    ...(listingId ? { listingId } : {}),
    listingName: listingName ?? listingId ?? reviewId,
    submissionType: normalizeToken(
      readString(record.submissionType ?? record.submission_type),
      "METADATA",
    ),
    reviewStatus: normalizeToken(
      readString(record.reviewStatus ?? record.review_status ?? record.status),
      "PENDING",
    ),
    ...(assignedTo ? { assignedTo } : {}),
    ...(priority === undefined ? {} : { priority }),
    ...(submittedAt ? { submittedAt } : {}),
  };
}

async function callModerationOperation<T>(
  operation: string,
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const record = asRecord(error);
    const status = readNumber(record.status ?? record.statusCode ?? record.status_code);
    const detail = readString(record.detail ?? record.message) ?? `${operation} failed`;
    if (status === 401) {
      throw new AppStoreModerationServiceError("unauthorized", detail, status);
    }
    if (status === 403) {
      throw new AppStoreModerationServiceError("forbidden", detail, status);
    }
    if (status === 404) {
      throw new AppStoreModerationServiceError("not-found", detail, status);
    }
    if (status === 409) {
      throw new AppStoreModerationServiceError("conflict", detail, status);
    }
    if (status === 400 || status === 422) {
      throw new AppStoreModerationServiceError("validation", detail, status);
    }
    if (status === 429 || status === 502 || status === 503 || status === 504) {
      throw new AppStoreModerationServiceError("unavailable", detail, status);
    }
    throw new AppStoreModerationServiceError("unknown", detail, status);
  }
}

function createIdempotencyKey(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  return randomUuid ?? `moderation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeToken(value: string | undefined, fallback: string): string {
  const normalized = value?.trim().toUpperCase();
  return normalized || fallback;
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

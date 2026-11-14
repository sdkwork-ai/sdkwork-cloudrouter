import type { PaymentIntentListQuery, RefundListQuery } from '../paymentsService';

/**
 * Query translation for the payment record and refund record consoles.
 *
 * The consoles render generic filter controls (select / text / date-time), but
 * the payment backend speaks typed list queries with RFC 3339 creation bounds.
 * Keeping that translation in one pure module makes it testable and keeps the
 * page component free of wire-format details.
 */

export const PAYMENT_INTENT_STATUSES = [
  'created',
  'pending',
  'processing',
  'succeeded',
  'failed',
  'canceled',
  'closed',
] as const;

export const REFUND_STATUSES = ['submitted', 'processing', 'succeeded', 'failed', 'closed'] as const;

export const REFUND_REASON_CODES = [
  'customer_request',
  'duplicate',
  'fraud',
  'service_failure',
  'other',
] as const;

export const WEBHOOK_EVENT_STATUSES = [
  'queued',
  'processing',
  'processed',
  'failed',
  'dead',
] as const;

export const RECONCILIATION_RUN_STATUSES = [
  'pending',
  'queued',
  'running',
  'succeeded',
  'failed',
  'canceled',
] as const;

/** Hard cap for one CSV export, mirroring what a finance operator can review. */
export const PAYMENT_RECORD_EXPORT_LIMIT = 5000;
/** Page size used while walking an export; the backend caps `page_size` at 200. */
export const PAYMENT_RECORD_EXPORT_PAGE_SIZE = 200;

export type PaymentRecordQueryInput = {
  page?: number;
  pageSize?: number;
  filters?: Record<string, string>;
  /** Committed server-side search term from the resource center. */
  search?: string;
};

type RefundStatus = (typeof REFUND_STATUSES)[number];
type RefundReasonCode = (typeof REFUND_REASON_CODES)[number];

function trimmed(value: string | undefined): string | undefined {
  const next = (value ?? '').trim();
  return next ? next : undefined;
}

/**
 * Converts a `datetime-local` control value into an RFC 3339 UTC instant.
 *
 * `datetime-local` carries no zone designator; `new Date()` interprets it in the
 * operator's browser zone, which is what "created after 09:00 my time" means.
 * Unparsable input is dropped instead of producing an invalid request.
 */
export function toRfc3339OrUndefined(value: string | undefined): string | undefined {
  const next = trimmed(value);
  if (!next) {
    return undefined;
  }
  const parsed = new Date(next);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed.toISOString();
}

export function isRefundStatus(value: string | undefined): value is RefundStatus {
  return Boolean(value) && (REFUND_STATUSES as readonly string[]).includes(value as string);
}

export function isRefundReasonCode(value: string | undefined): value is RefundReasonCode {
  return Boolean(value) && (REFUND_REASON_CODES as readonly string[]).includes(value as string);
}

/** Builds the payment intent (payment record) list query from console filters. */
export function buildPaymentRecordListQuery(
  input?: PaymentRecordQueryInput,
): NonNullable<PaymentIntentListQuery> {
  const filters = input?.filters ?? {};
  const status = trimmed(filters.status);
  const providerCode = trimmed(filters.providerCode);
  const currencyCode = trimmed(filters.currencyCode);
  const orderId = trimmed(filters.orderId);
  const ownerUserId = trimmed(filters.ownerUserId);
  const createdAfter = toRfc3339OrUndefined(filters.createdAfter);
  const createdBefore = toRfc3339OrUndefined(filters.createdBefore);
  const search = trimmed(input?.search);
  return {
    ...(input?.page ? { page: input.page } : {}),
    ...(input?.pageSize ? { pageSize: input.pageSize } : {}),
    ...(search ? { q: search } : {}),
    ...(status ? { status } : {}),
    ...(providerCode ? { providerCode } : {}),
    ...(currencyCode ? { currencyCode } : {}),
    ...(orderId ? { orderId } : {}),
    ...(ownerUserId ? { ownerUserId } : {}),
    ...(createdAfter ? { createdAfter } : {}),
    ...(createdBefore ? { createdBefore } : {}),
  };
}

/** Builds the refund record list query from console filters. */
export function buildRefundListQuery(input?: PaymentRecordQueryInput): NonNullable<RefundListQuery> {
  const filters = input?.filters ?? {};
  const status = trimmed(filters.status);
  const providerCode = trimmed(filters.providerCode);
  const currencyCode = trimmed(filters.currencyCode);
  const paymentIntentId = trimmed(filters.paymentIntentId);
  const orderId = trimmed(filters.orderId);
  const reasonCode = trimmed(filters.reasonCode);
  const createdAfter = toRfc3339OrUndefined(filters.createdAfter);
  const createdBefore = toRfc3339OrUndefined(filters.createdBefore);
  const search = trimmed(input?.search);
  return {
    ...(input?.page ? { page: input.page } : {}),
    ...(input?.pageSize ? { pageSize: input.pageSize } : {}),
    ...(search ? { q: search } : {}),
    ...(isRefundStatus(status) ? { status } : {}),
    ...(providerCode ? { providerCode } : {}),
    ...(currencyCode ? { currencyCode } : {}),
    ...(paymentIntentId ? { paymentIntentId } : {}),
    ...(orderId ? { orderId } : {}),
    ...(isRefundReasonCode(reasonCode) ? { reasonCode } : {}),
    ...(createdAfter ? { createdAfter } : {}),
    ...(createdBefore ? { createdBefore } : {}),
  };
}

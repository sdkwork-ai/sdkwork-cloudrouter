import type { PaymentIntent, Refund } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import { backendPaymentsIntentsList, backendPaymentsRefundsList } from '../paymentsService';
import type { PaymentIntentListQuery, RefundListQuery } from '../paymentsService';
import {
  PAYMENT_RECORD_EXPORT_LIMIT,
  PAYMENT_RECORD_EXPORT_PAGE_SIZE,
} from './paymentRecordsQuery';

/**
 * CSV export for payment and refund records.
 *
 * A finance console export must contain the whole filtered result set, not the
 * visible page, so the collector walks server pages until the backend returns a
 * short page or the operator-facing cap is reached. The cap is explicit and
 * surfaced to the operator instead of silently truncating.
 */

export type PaymentRecordsExportResult<T> = {
  items: T[];
  /** True when the result set is larger than the export cap. */
  truncated: boolean;
};

const MAX_EXPORT_PAGES = Math.ceil(PAYMENT_RECORD_EXPORT_LIMIT / PAYMENT_RECORD_EXPORT_PAGE_SIZE);

/** Walks every page of the filtered payment record query, up to the export cap. */
export async function collectPaymentRecords(
  query: NonNullable<PaymentIntentListQuery>,
): Promise<PaymentRecordsExportResult<PaymentIntent>> {
  const items: PaymentIntent[] = [];
  for (let page = 1; page <= MAX_EXPORT_PAGES; page += 1) {
    const result = await backendPaymentsIntentsList({
      ...query,
      page,
      pageSize: PAYMENT_RECORD_EXPORT_PAGE_SIZE,
    });
    const batch = result?.items ?? [];
    items.push(...batch);
    if (batch.length < PAYMENT_RECORD_EXPORT_PAGE_SIZE) {
      return { items, truncated: false };
    }
    if (items.length >= PAYMENT_RECORD_EXPORT_LIMIT) {
      return { items: items.slice(0, PAYMENT_RECORD_EXPORT_LIMIT), truncated: true };
    }
  }
  return { items: items.slice(0, PAYMENT_RECORD_EXPORT_LIMIT), truncated: true };
}

/** Walks every page of the filtered refund query, up to the export cap. */
export async function collectRefundRecords(
  query: NonNullable<RefundListQuery>,
): Promise<PaymentRecordsExportResult<Refund>> {
  const items: Refund[] = [];
  for (let page = 1; page <= MAX_EXPORT_PAGES; page += 1) {
    const result = await backendPaymentsRefundsList({
      ...query,
      page,
      pageSize: PAYMENT_RECORD_EXPORT_PAGE_SIZE,
    });
    const batch = result?.items ?? [];
    items.push(...batch);
    if (batch.length < PAYMENT_RECORD_EXPORT_PAGE_SIZE) {
      return { items, truncated: false };
    }
    if (items.length >= PAYMENT_RECORD_EXPORT_LIMIT) {
      return { items: items.slice(0, PAYMENT_RECORD_EXPORT_LIMIT), truncated: true };
    }
  }
  return { items: items.slice(0, PAYMENT_RECORD_EXPORT_LIMIT), truncated: true };
}

/** Escapes one CSV cell (RFC 4180 quoting; never emits a bare newline). */
export function escapeCsvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /["\n\r,]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Builds RFC 4180 CSV content with CRLF row separators. */
export function buildCsvContent(
  headers: readonly string[],
  rows: readonly (readonly unknown[])[],
): string {
  return [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\r\n');
}

/** Stable, sortable export file name: `<prefix>-YYYYMMDD-HHmm.csv`. */
export function buildCsvFileName(prefix: string, at: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${prefix}-${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}-${pad(at.getHours())}${pad(at.getMinutes())}.csv`;
}

/** Triggers a browser download with a UTF-8 BOM so Excel keeps the encoding. */
export function downloadCsvFile(fileName: string, content: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return;
  }
  const blob = new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // 延迟回收：部分浏览器在 click 同步返回后才真正开始读取 blob。
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export type PaymentRecordRowFormatting = {
  formatAmount: (value: unknown, currencyCode: unknown) => string;
  formatDateTime: (value: unknown) => string;
  translateStatus: (value: unknown) => string;
  translateReason: (value: unknown) => string;
  translateRequestedBy: (value: unknown) => string;
};

/** Maps payment records to export cells in the same order as the table columns. */
export function buildPaymentRecordCsvRows(
  records: readonly PaymentIntent[],
  formatting: PaymentRecordRowFormatting,
): string[][] {
  return records.map((record) => [
    record.paymentIntentNo ?? '',
    record.orderId ?? '',
    record.ownerUserId ?? '',
    record.paymentMethod ?? '',
    record.providerCode ?? '',
    formatting.formatAmount(record.amount, record.currencyCode),
    record.currencyCode ?? '',
    formatting.translateStatus(record.status),
    formatting.formatDateTime(record.createdAt),
    formatting.formatDateTime(record.updatedAt),
  ]);
}

/** Maps refunds to export cells in the same order as the table columns. */
export function buildRefundCsvRows(
  records: readonly Refund[],
  formatting: PaymentRecordRowFormatting,
): string[][] {
  return records.map((record) => [
    record.refundNo ?? '',
    record.orderId ?? '',
    record.paymentIntentId ?? '',
    record.paymentAttemptId ?? '',
    record.providerCode ?? '',
    formatting.formatAmount(record.amount, record.currencyCode),
    record.currencyCode ?? '',
    formatting.translateStatus(record.status),
    formatting.translateReason(record.reasonCode),
    formatting.translateRequestedBy(record.requestedByType),
    record.requestedBy ?? '',
    formatting.formatDateTime(record.createdAt),
    formatting.formatDateTime(record.updatedAt),
  ]);
}

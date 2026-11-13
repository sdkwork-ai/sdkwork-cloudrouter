import { createIdempotencyParams } from '@sdkwork/cloudroutes-pc-commons/idempotency';
import {
  getSdkworkOrderAppSdkClient,
  type SdkworkOrderAppSdkClient,
} from '@sdkwork/cloudroutes-pc-commons/sdk-clients';
import type {
  SdkworkOrderCheckoutDriver,
  SdkworkOrderCheckoutPayment,
  SdkworkOrderCheckoutSummary,
} from '@sdkwork/order-pc-checkout';
import { formatMoneyMinorUnits } from '@sdkwork/utils/money';

/**
 * PC cashier service over the generated Order App SDK.
 *
 * The order/payment backends expose one order-scoped payment command
 * (`POST /orders/{orderId}/payments`) plus a `payment_success` probe. The PC
 * cashier reuses the order-owned checkout dialog
 * (`@sdkwork/order-pc-checkout`) and only supplies this driver; no cashier UI
 * or payment protocol is reimplemented here.
 */

/** Order fields the PC cashier needs from `GET /orders/{orderId}`. */
export interface CloudRouterCashierOrder {
  readonly id: string;
  readonly orderSn: string;
  readonly subject: string;
  readonly status: string;
  readonly statusName: string;
  readonly totalAmount: string;
  readonly currencyCode: string;
  readonly expireTime?: string;
}

const PAYABLE_STATUSES: ReadonlySet<string> = new Set(['pending_payment']);
const SETTLED_STATUSES: ReadonlySet<string> = new Set([
  'paid',
  'fulfilled',
  'completed',
  'refunding',
  'refunded',
]);

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

/** Maps the order read model onto the PC cashier order. */
export function toCloudRouterCashierOrder(value: unknown): CloudRouterCashierOrder {
  const record = readRecord(value);
  const id = readString(record.orderId) ?? readString(record.id);
  if (!id) {
    throw new Error('Order response is missing orderId.');
  }
  return {
    id,
    orderSn: readString(record.orderSn) ?? id,
    subject: readString(record.subject) ?? '',
    status: readString(record.status) ?? 'pending_payment',
    statusName: readString(record.statusName) ?? readString(record.status) ?? '',
    totalAmount: readString(record.totalAmount) ?? readString(record.payableAmount) ?? '0',
    currencyCode: readString(record.currencyCode) ?? 'CNY',
    expireTime: readString(record.expireTime),
  };
}

/**
 * Loads one order through the shared portal SDK boundary.
 * @param orderId - the order primary key carried by the cashier URL.
 * @param client - optional pre-bound order client (tests/hosts).
 */
export async function loadCloudRouterCashierOrder(
  orderId: string,
  client: SdkworkOrderAppSdkClient = getSdkworkOrderAppSdkClient(),
): Promise<CloudRouterCashierOrder> {
  const value = await client.orders.retrieve(orderId);
  return toCloudRouterCashierOrder(value);
}

/** Whether the order can still start a payment attempt. */
export function isCloudRouterCashierPayable(order: CloudRouterCashierOrder): boolean {
  return PAYABLE_STATUSES.has(order.status);
}

/** Whether the order has already settled (paid or beyond). */
export function isCloudRouterCashierSettled(order: CloudRouterCashierOrder): boolean {
  return SETTLED_STATUSES.has(order.status);
}

/** Formats the order amount for the checkout dialog summary. */
export function formatCloudRouterCashierAmount(
  order: CloudRouterCashierOrder,
  locale: string,
): string {
  const minor = Number(order.totalAmount);
  if (!Number.isFinite(minor)) {
    return order.totalAmount;
  }
  return formatMoneyMinorUnits(minor, order.currencyCode, locale, 'symbol') ?? order.totalAmount;
}

/** Checkout dialog summary derived from the order. */
export function toCloudRouterCashierSummary(
  order: CloudRouterCashierOrder,
  localizedSubject: string,
  locale: string,
): SdkworkOrderCheckoutSummary {
  return {
    id: order.id,
    name: localizedSubject || order.subject || order.orderSn,
    priceLabel: formatCloudRouterCashierAmount(order, locale),
  };
}

export interface CreateCloudRouterCashierDriverOptions {
  readonly client?: SdkworkOrderAppSdkClient;
  /** Wire method requested from the order payment command. */
  readonly paymentMethod?: string;
  /** Called once when the probe observes a settled payment. */
  readonly onSettled?: () => void;
}

/**
 * Builds the `SdkworkOrderCheckoutDialog` driver for one order.
 *
 * `createPayment` issues the order-owned payment command and maps the provider
 * parameters (QR payload / H5 cashier URL) onto the dialog payment shape;
 * `getPaymentStatus` probes the authoritative `payment_success` endpoint and
 * refreshes the order so a settled, cancelled, or expired order ends the
 * cashier instead of creating a second attempt.
 */
export function createCloudRouterCashierCheckoutDriver(
  order: CloudRouterCashierOrder,
  options: CreateCloudRouterCashierDriverOptions = {},
): SdkworkOrderCheckoutDriver {
  const client = options.client ?? getSdkworkOrderAppSdkClient();
  const paymentMethod = options.paymentMethod ?? 'wechat_pay';

  const loadLatestStatus = async (): Promise<CloudRouterCashierOrder | null> => {
    try {
      return await loadCloudRouterCashierOrder(order.id, client);
    } catch {
      // The probe below is authoritative for settlement; a failed refresh only
      // keeps the cashier pending instead of failing a live payment.
      return null;
    }
  };

  return {
    async createPayment(): Promise<SdkworkOrderCheckoutPayment> {
      if (!isCloudRouterCashierPayable(order)) {
        return {
          orderId: order.id,
          status: isCloudRouterCashierSettled(order) ? 'completed' : 'failed',
        };
      }
      const result = readRecord(await client.orders.payments.create(
        order.id,
        { paymentMethod },
        createIdempotencyParams('cloudrouter-cashier-payment'),
      ));
      const params = readRecord(result.paymentParams);
      const qrCode = readString(params.qrCodePayload)
        ?? readString(params.qrCodeUrl)
        ?? readString(params.cashierUrl);
      return {
        cashierUrl: readString(params.cashierUrl),
        expiresAt: order.expireTime,
        orderId: order.id,
        qrCode,
        status: 'pending',
      };
    },

    async getPaymentStatus(): Promise<SdkworkOrderCheckoutPayment> {
      const probe = await client.orders.paymentSuccess.retrieve(order.id);
      if (probe.paid) {
        options.onSettled?.();
        return {
          cashierUrl: undefined,
          expiresAt: order.expireTime,
          orderId: order.id,
          status: 'completed',
        };
      }
      const latest = await loadLatestStatus();
      if (!latest || isCloudRouterCashierPayable(latest)) {
        return {
          expiresAt: latest?.expireTime ?? order.expireTime,
          orderId: order.id,
          status: 'pending',
        };
      }
      return {
        expiresAt: latest.expireTime,
        orderId: order.id,
        status: isCloudRouterCashierSettled(latest) ? 'completed' : 'failed',
      };
    },
  };
}

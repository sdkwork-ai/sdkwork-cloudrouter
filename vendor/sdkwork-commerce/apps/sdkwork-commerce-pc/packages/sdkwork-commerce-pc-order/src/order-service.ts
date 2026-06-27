import {
  getSdkworkCommerceService,
  hasSdkworkCommerceSession,
  requireSdkworkCommerceSession,
  toNullableSdkworkCommerceNumber,
  toSdkworkCommerceNumber,
  toSdkworkCommerceOptionalString,
  unwrapSdkworkCommerceResponse,
  readSdkworkMediaResource,
  type SdkworkCommerceService,
  type SdkworkMediaResource,
} from "@sdkwork/commerce-service";
import {
  createSdkworkOrderMessages,
  type SdkworkOrderMessages,
  type SdkworkOrderMessagesOverrides,
} from "./order-copy";

export type SdkworkOrderStatus =
  | "cancelled"
  | "completed"
  | "expired"
  | "paid"
  | "pending-payment"
  | "refunded"
  | "refunding"
  | "unknown";

export interface SdkworkOrderSummary {
  createdAt: string;
  discountAmountCny: number | null;
  expireTime?: string;
  id: string;
  orderSn?: string;
  paidAmountCny: number | null;
  payTime?: string;
  paymentMethod?: string;
  paymentProvider?: string;
  productImage?: SdkworkMediaResource;
  quantity: number;
  remark?: string;
  status: SdkworkOrderStatus;
  statusLabel: string;
  subject: string;
  totalAmountCny: number | null;
}

export interface SdkworkOrderStatistics {
  completed: number;
  pendingPayment: number;
  pendingReceipt: number;
  pendingShipment: number;
  totalAmountCny: number | null;
  totalOrders: number;
}

export interface SdkworkOrderItem {
  id: string;
  image?: SdkworkMediaResource;
  name: string;
  quantity: number;
  totalAmountCny: number | null;
  unitPriceCny: number | null;
}

export interface SdkworkOrderTimelineEvent {
  label: string;
  occurredAt?: string;
  tone: "danger" | "default" | "success" | "warning";
}

export interface SdkworkOrderDetail {
  createdAt: string;
  id: string;
  items: SdkworkOrderItem[];
  orderSn?: string;
  outTradeNo?: string;
  paidAmountCny: number | null;
  payTime?: string;
  paymentMethod?: string;
  productImage?: SdkworkMediaResource;
  quantity: number;
  remark?: string;
  status: SdkworkOrderStatus;
  statusLabel: string;
  subject: string;
  timeline: SdkworkOrderTimelineEvent[];
  totalAmountCny: number | null;
  transactionId?: string;
}

export interface SdkworkOrderDashboardData {
  orders: SdkworkOrderSummary[];
  statistics: SdkworkOrderStatistics;
}

export interface SdkworkOrderPaymentInput {
  orderId: string;
  paymentMethod?: string;
  paymentPassword?: string;
}

export interface SdkworkOrderPaymentResult {
  amountCny: number | null;
  orderId: string;
  outTradeNo?: string;
  paymentId?: string;
  paymentMethod?: string;
  paymentParams: Record<string, unknown>;
}

export interface SdkworkOrderCancelInput {
  cancelReason?: string;
  cancelType?: string;
  orderId: string;
}

export interface SdkworkOrderCancelResult {
  cancelled: true;
  orderId: string;
}

export interface CreateSdkworkOrderServiceOptions {
  commerceService?: SdkworkCommerceService;
  locale?: string | null;
  messages?: SdkworkOrderMessagesOverrides;
}

export interface SdkworkOrderService {
  cancelOrder(input: SdkworkOrderCancelInput): Promise<SdkworkOrderCancelResult>;
  getDashboard(): Promise<SdkworkOrderDashboardData>;
  getEmptyDashboard(): SdkworkOrderDashboardData;
  getOrderDetail(orderId: string): Promise<SdkworkOrderDetail>;
  payOrder(input: SdkworkOrderPaymentInput): Promise<SdkworkOrderPaymentResult>;
}

interface RemoteOrder {
  createdAt?: string;
  discountAmount?: number | string;
  expireTime?: string;
  orderId?: string;
  orderSn?: string;
  paidAmount?: number | string;
  payTime?: string;
  paymentMethod?: string;
  paymentProvider?: string;
  productImage?: unknown;
  quantity?: number | string;
  remark?: string;
  status?: string;
  statusName?: string;
  subject?: string;
  totalAmount?: number | string;
}

interface RemoteOrderItem {
  id?: string;
  productImage?: unknown;
  productName?: string;
  quantity?: number | string;
  totalAmount?: number | string;
  unitPrice?: number | string;
}

interface RemoteOrderDetail extends RemoteOrder {
  items?: RemoteOrderItem[];
  outTradeNo?: string;
  transactionId?: string;
}

interface RemoteOrderStatistics {
  completed?: number | string;
  pendingPayment?: number | string;
  pendingReceipt?: number | string;
  pendingShipment?: number | string;
  totalAmount?: number | string;
  totalOrders?: number | string;
}

interface RemoteOrderStatus {
  status?: string;
  statusName?: string;
}

interface RemoteOrderPaymentSuccess {
  paid?: boolean;
  status?: string;
  statusName?: string;
}

interface RemotePaymentParams {
  amount?: number | string;
  orderId?: string;
  outTradeNo?: string;
  paymentId?: string;
  paymentMethod?: string;
  paymentParams?: Record<string, unknown>;
}

type SdkworkOrderCopyContext = Pick<SdkworkOrderMessages, "status" | "timeline">;
type SdkworkOrderServiceCopy = SdkworkOrderMessages["service"];

function mapOrderStatus(status: string | undefined): SdkworkOrderStatus {
  const normalized = (status || "").trim().toUpperCase();
  if (normalized === "PENDING_PAYMENT" || normalized === "UNPAID" || normalized === "WAIT_PAY") {
    return "pending-payment";
  }

  if (normalized === "PAID") {
    return "paid";
  }

  if (normalized === "COMPLETED" || normalized === "FINISHED") {
    return "completed";
  }

  if (normalized === "CANCELLED" || normalized === "CANCELED" || normalized === "CLOSED") {
    return "cancelled";
  }

  if (normalized === "EXPIRED" || normalized === "TIMEOUT") {
    return "expired";
  }

  if (normalized === "REFUNDING") {
    return "refunding";
  }

  if (normalized === "REFUNDED") {
    return "refunded";
  }

  return "unknown";
}

function formatStatusLabel(
  status: SdkworkOrderStatus,
  messages: SdkworkOrderCopyContext,
): string {
  if (status === "cancelled") {
    return messages.status.cancelled;
  }

  if (status === "completed") {
    return messages.status.completed;
  }

  if (status === "expired") {
    return messages.status.expired;
  }

  if (status === "paid") {
    return messages.status.paid;
  }

  if (status === "pending-payment") {
    return messages.status.pendingPayment;
  }

  if (status === "refunded") {
    return messages.status.refunded;
  }

  if (status === "refunding") {
    return messages.status.refunding;
  }

  return messages.status.unknown;
}

function createEmptyDashboard(): SdkworkOrderDashboardData {
  return {
    orders: [],
    statistics: {
      completed: 0,
      pendingPayment: 0,
      pendingReceipt: 0,
      pendingShipment: 0,
      totalAmountCny: 0,
      totalOrders: 0,
    },
  };
}

function mapOrderSummary(
  order: RemoteOrder,
  messages: SdkworkOrderCopyContext,
  copy: SdkworkOrderServiceCopy,
): SdkworkOrderSummary {
  const status = mapOrderStatus(order.status);

  return {
    createdAt: toSdkworkCommerceOptionalString(order.createdAt) || new Date(0).toISOString(),
    discountAmountCny: toNullableSdkworkCommerceNumber(order.discountAmount),
    expireTime: toSdkworkCommerceOptionalString(order.expireTime),
    id: toSdkworkCommerceOptionalString(order.orderId) || "unknown-order",
    orderSn: toSdkworkCommerceOptionalString(order.orderSn),
    paidAmountCny: toNullableSdkworkCommerceNumber(order.paidAmount),
    payTime: toSdkworkCommerceOptionalString(order.payTime),
    paymentMethod: toSdkworkCommerceOptionalString(order.paymentMethod),
    paymentProvider: toSdkworkCommerceOptionalString(order.paymentProvider),
    productImage: readSdkworkMediaResource(order.productImage),
    quantity: toSdkworkCommerceNumber(order.quantity, 1),
    remark: toSdkworkCommerceOptionalString(order.remark),
    status,
    statusLabel: toSdkworkCommerceOptionalString(order.statusName) || formatStatusLabel(status, messages),
    subject: toSdkworkCommerceOptionalString(order.subject) || copy.summaryFallbackSubject,
    totalAmountCny: toNullableSdkworkCommerceNumber(order.totalAmount),
  };
}

function mapStatistics(statistics: RemoteOrderStatistics | null | undefined): SdkworkOrderStatistics {
  return {
    completed: toSdkworkCommerceNumber(statistics?.completed),
    pendingPayment: toSdkworkCommerceNumber(statistics?.pendingPayment),
    pendingReceipt: toSdkworkCommerceNumber(statistics?.pendingReceipt),
    pendingShipment: toSdkworkCommerceNumber(statistics?.pendingShipment),
    totalAmountCny: toNullableSdkworkCommerceNumber(statistics?.totalAmount),
    totalOrders: toSdkworkCommerceNumber(statistics?.totalOrders),
  };
}

function mapItems(items: RemoteOrderItem[] | undefined, copy: SdkworkOrderServiceCopy): SdkworkOrderItem[] {
  return (items ?? []).map((item, index) => ({
    id: toSdkworkCommerceOptionalString(item.id) || `order-item-${index + 1}`,
    image: readSdkworkMediaResource(item.productImage),
    name: toSdkworkCommerceOptionalString(item.productName) || copy.itemFallbackName,
    quantity: toSdkworkCommerceNumber(item.quantity, 1),
    totalAmountCny: toNullableSdkworkCommerceNumber(item.totalAmount),
    unitPriceCny: toNullableSdkworkCommerceNumber(item.unitPrice),
  }));
}

function createTimeline(
  detail: RemoteOrderDetail,
  status: RemoteOrderStatus | null,
  paymentSuccess: RemoteOrderPaymentSuccess | null,
  messages: SdkworkOrderCopyContext,
): SdkworkOrderTimelineEvent[] {
  const resolvedStatus = mapOrderStatus(status?.status || detail.status);
  const events: SdkworkOrderTimelineEvent[] = [
    {
      label: messages.timeline.created,
      occurredAt: toSdkworkCommerceOptionalString(detail.createdAt),
      tone: "default",
    },
  ];

  const paid = Boolean(paymentSuccess?.paid || resolvedStatus === "paid" || resolvedStatus === "completed");
  if (paid) {
    events.push({
      label: messages.timeline.paid,
      occurredAt: toSdkworkCommerceOptionalString(detail.payTime),
      tone: "success",
    });
  }

  const statusLabel = toSdkworkCommerceOptionalString(status?.statusName)
    || toSdkworkCommerceOptionalString(paymentSuccess?.statusName)
    || toSdkworkCommerceOptionalString(detail.statusName)
    || formatStatusLabel(resolvedStatus, messages);
  events.push({
    label: statusLabel,
    tone:
      resolvedStatus === "cancelled" || resolvedStatus === "expired"
        ? "danger"
        : resolvedStatus === "pending-payment"
          ? "warning"
          : "default",
  });

  return events;
}

function mapDetail(
  detail: RemoteOrderDetail | null | undefined,
  status: RemoteOrderStatus | null,
  paymentSuccess: RemoteOrderPaymentSuccess | null,
  messages: SdkworkOrderCopyContext,
  copy: SdkworkOrderServiceCopy,
): SdkworkOrderDetail {
  const summary = mapOrderSummary(detail ?? {}, messages, copy);
  const resolvedStatus = mapOrderStatus(status?.status || detail?.status);

  return {
    createdAt: summary.createdAt,
    id: summary.id,
    items: mapItems(detail?.items, copy),
    orderSn: summary.orderSn,
    outTradeNo: toSdkworkCommerceOptionalString(detail?.outTradeNo),
    paidAmountCny: summary.paidAmountCny,
    payTime: summary.payTime,
    paymentMethod: summary.paymentMethod,
    productImage: summary.productImage,
    quantity: summary.quantity,
    remark: summary.remark,
    status: resolvedStatus,
    statusLabel:
      toSdkworkCommerceOptionalString(status?.statusName)
      || toSdkworkCommerceOptionalString(detail?.statusName)
      || formatStatusLabel(resolvedStatus, messages),
    subject: summary.subject,
    timeline: createTimeline(detail ?? {}, status, paymentSuccess, messages),
    totalAmountCny: summary.totalAmountCny,
    transactionId: toSdkworkCommerceOptionalString(detail?.transactionId),
  };
}

function mapPaymentResult(result: RemotePaymentParams | null | undefined): SdkworkOrderPaymentResult {
  return {
    amountCny: toNullableSdkworkCommerceNumber(result?.amount),
    orderId: toSdkworkCommerceOptionalString(result?.orderId) || "",
    outTradeNo: toSdkworkCommerceOptionalString(result?.outTradeNo),
    paymentId: toSdkworkCommerceOptionalString(result?.paymentId),
    paymentMethod: toSdkworkCommerceOptionalString(result?.paymentMethod),
    paymentParams: (result?.paymentParams ?? {}) as Record<string, unknown>,
  };
}

export function createSdkworkOrderService(
  options: CreateSdkworkOrderServiceOptions = {},
): SdkworkOrderService {
  const messages = createSdkworkOrderMessages(options.locale, options.messages);
  const copy = messages.service;
  const getCommerceService = () => options.commerceService ?? getSdkworkCommerceService();

  return {
    async cancelOrder(input) {
      requireSdkworkCommerceSession(copy.signInRequired);
      await unwrapSdkworkCommerceResponse<void>(
        await getCommerceService().orders.cancel(input.orderId, {
          cancelReason: toSdkworkCommerceOptionalString(input.cancelReason),
          cancelType: toSdkworkCommerceOptionalString(input.cancelType),
        }),
        copy.cancelFailed,
      );

      return {
        cancelled: true,
        orderId: input.orderId,
      };
    },

    async getDashboard() {
      if (!hasSdkworkCommerceSession()) {
        return createEmptyDashboard();
      }

      const [orderPagePayload, statisticsPayload] = await Promise.all([
        getCommerceService().orders.list({
            page: 1,
            pageSize: 20,
            sortDirection: "desc",
            sortField: "createdAt",
        }),
        getCommerceService().orders.statistics.retrieve(),
      ]);
      const orderPage = unwrapSdkworkCommerceResponse<{ content?: RemoteOrder[] }>(
        orderPagePayload,
        copy.requestFailed,
      );
      const statistics = unwrapSdkworkCommerceResponse<RemoteOrderStatistics | null>(
        statisticsPayload,
        copy.requestFailed,
      );

      return {
        orders: (orderPage.content ?? [])
          .map((order) => mapOrderSummary(order, messages, copy))
          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
        statistics: mapStatistics(statistics),
      };
    },

    getEmptyDashboard() {
      return createEmptyDashboard();
    },

    async getOrderDetail(orderId) {
      requireSdkworkCommerceSession(copy.signInRequired);
      const [detailPayload, statusPayload, paymentSuccessPayload] = await Promise.all([
        getCommerceService().orders.retrieve(orderId),
        getCommerceService().orders.status.retrieve(orderId),
        getCommerceService().orders.paymentSuccess.retrieve(orderId),
      ]);
      const detail = unwrapSdkworkCommerceResponse<RemoteOrderDetail | null>(detailPayload, copy.requestFailed);
      const status = unwrapSdkworkCommerceResponse<RemoteOrderStatus | null>(statusPayload, copy.requestFailed);
      const paymentSuccess = unwrapSdkworkCommerceResponse<RemoteOrderPaymentSuccess | null>(
        paymentSuccessPayload,
        copy.requestFailed,
      );

      return mapDetail(detail, status, paymentSuccess, messages, copy);
    },

    async payOrder(input) {
      requireSdkworkCommerceSession(copy.signInRequired);
      const result = unwrapSdkworkCommerceResponse<RemotePaymentParams>(
        await getCommerceService().orders.pay(input.orderId, {
          paymentMethod: toSdkworkCommerceOptionalString(input.paymentMethod),
          paymentPassword: toSdkworkCommerceOptionalString(input.paymentPassword),
        }),
        copy.payFailed,
      );

      return mapPaymentResult(result);
    },
  };
}

export const sdkworkOrderService = createSdkworkOrderService();

import {
  getSdkworkCommerceService,
  hasSdkworkCommerceSession,
  requireSdkworkCommerceSession,
  toNullableSdkworkCommerceNumber,
  toSdkworkCommerceNumber,
  toSdkworkCommerceOptionalString,
  unwrapSdkworkCommerceResponse,
  readSdkworkMediaResource,
  toExternalSdkworkMediaResource,
  type SdkworkCommerceService,
} from "@sdkwork/commerce-service";
import {
  createSdkworkPaymentMessages,
  type SdkworkPaymentMessages,
  type SdkworkPaymentMessagesOverrides,
} from "./payment-copy";
import {
  summarizeSdkworkPayments,
  type SdkworkPaymentClientType,
  type SdkworkPaymentDetail,
  type SdkworkPaymentMethod,
  type SdkworkPaymentProductType,
  type SdkworkPaymentProductTypeOption,
  type SdkworkPaymentStatus,
  type SdkworkPaymentStatusDigest,
  type SdkworkPaymentSummary,
} from "./payment";

export interface SdkworkPaymentStatistics {
  closedPayments: number;
  failedPayments: number;
  pendingPayments: number;
  successPayments: number;
  timeoutPayments: number;
  totalPayments: number;
}

export interface SdkworkPaymentDashboardData {
  clientType: SdkworkPaymentClientType;
  digest: SdkworkPaymentStatusDigest;
  methods: SdkworkPaymentMethod[];
  records: SdkworkPaymentSummary[];
  statistics: SdkworkPaymentStatistics;
}

export interface SdkworkPaymentCreateInput {
  amountCny?: number | null;
  businessOrderId?: string;
  businessType?: string;
  clientIp?: string;
  orderId: string;
  paymentMethod: string;
  paymentProvider?: string;
  paymentScene?: string;
  productType?: SdkworkPaymentProductType;
}

export interface SdkworkPaymentReconcileInput {
  orderId?: string;
  outTradeNo?: string;
  reconcileType?: "ORDER_ID" | "OUT_TRADE_NO";
}

export interface SdkworkPaymentCloseResult {
  closed: true;
  paymentId: string;
}

export interface CreateSdkworkPaymentServiceOptions {
  clientType?: SdkworkPaymentClientType;
  commerceService?: SdkworkCommerceService;
  locale?: string | null;
  messages?: SdkworkPaymentMessagesOverrides;
  pageSize?: number;
}

export interface SdkworkPaymentService {
  closePayment(paymentId: string): Promise<SdkworkPaymentCloseResult>;
  createPayment(input: SdkworkPaymentCreateInput): Promise<SdkworkPaymentDetail>;
  getDashboard(): Promise<SdkworkPaymentDashboardData>;
  getEmptyDashboard(): SdkworkPaymentDashboardData;
  getPaymentDetail(paymentId: string): Promise<SdkworkPaymentDetail>;
  getPaymentStatus(paymentId: string): Promise<SdkworkPaymentSummary>;
  getPaymentStatusByOutTradeNo(outTradeNo: string): Promise<SdkworkPaymentSummary>;
  listOrderPayments(orderId: string): Promise<SdkworkPaymentSummary[]>;
  reconcilePayment(input: SdkworkPaymentReconcileInput): Promise<SdkworkPaymentSummary>;
}

interface RemotePageEnvelope<T> {
  content?: T[];
}

interface RemotePaymentMethodProductType {
  available?: boolean;
  code?: string;
  name?: string;
}

interface RemotePaymentMethod {
  available?: boolean;
  code?: string;
  icon?: unknown;
  methodIcon?: unknown;
  methodId?: string;
  methodName?: string;
  productTypes?: RemotePaymentMethodProductType[];
  sort?: number | string;
}

interface RemotePaymentStatus {
  amount?: number | string;
  createdAt?: string;
  expireTime?: string;
  orderId?: number | string;
  outTradeNo?: string;
  paymentId?: number | string;
  paymentMethod?: string;
  paymentProvider?: string;
  paymentProviderName?: string;
  paymentSn?: string;
  productType?: string;
  status?: string;
  statusName?: string;
  successTime?: string;
  transactionId?: string;
}

interface RemotePaymentRecord extends RemotePaymentStatus {}

interface RemotePaymentDetail extends RemotePaymentStatus {
  merchantOrderId?: string;
  needQuery?: boolean;
  paymentOrderId?: string;
  paymentParams?: Record<string, unknown>;
  paymentUrl?: string;
  qrCode?: unknown;
  qrImage?: unknown;
  queryInterval?: number | string;
  remark?: string;
  subject?: string;
}

interface RemotePaymentStatistics {
  closedPayments?: number | string;
  failedPayments?: number | string;
  pendingPayments?: number | string;
  successPayments?: number | string;
  timeoutPayments?: number | string;
  totalPayments?: number | string;
}

type SdkworkPaymentCopyContext = Pick<SdkworkPaymentMessages, "common" | "productType" | "status">;
type SdkworkPaymentServiceCopy = SdkworkPaymentMessages["service"];

function mapPaymentStatus(status: string | undefined): SdkworkPaymentStatus {
  const normalized = (status || "").trim().toUpperCase();
  if (normalized === "DEFAULT") {
    return "default";
  }

  if (normalized === "PENDING") {
    return "pending";
  }

  if (normalized === "SUCCESS" || normalized === "PAID" || normalized === "COMPLETED") {
    return "success";
  }

  if (normalized === "FAILED") {
    return "failed";
  }

  if (normalized === "TIMEOUT") {
    return "timeout";
  }

  if (normalized === "CLOSED") {
    return "closed";
  }

  return "unknown";
}

function formatStatusLabel(status: SdkworkPaymentStatus, messages: SdkworkPaymentCopyContext): string {
  if (status === "default") {
    return messages.status.default;
  }

  if (status === "pending") {
    return messages.status.pending;
  }

  if (status === "success") {
    return messages.status.success;
  }

  if (status === "failed") {
    return messages.status.failed;
  }

  if (status === "timeout") {
    return messages.status.timeout;
  }

  if (status === "closed") {
    return messages.status.closed;
  }

  return messages.status.unknown;
}

function mapProductType(code: string | undefined): SdkworkPaymentProductType {
  const normalized = (code || "").trim().toLowerCase();
  if (
    normalized === "app"
    || normalized === "h5"
    || normalized === "jsapi"
    || normalized === "miniapp"
    || normalized === "native"
    || normalized === "online_bank"
    || normalized === "pc"
  ) {
    return normalized;
  }

  return "unknown";
}

function formatProductTypeLabel(code: string | undefined, messages: SdkworkPaymentCopyContext): string {
  const productType = mapProductType(code);
  if (productType === "app") {
    return messages.productType.app;
  }

  if (productType === "h5") {
    return messages.productType.h5;
  }

  if (productType === "jsapi") {
    return messages.productType.jsapi;
  }

  if (productType === "miniapp") {
    return messages.productType.miniapp;
  }

  if (productType === "native") {
    return messages.productType.native;
  }

  if (productType === "online_bank") {
    return messages.productType.onlineBank;
  }

  if (productType === "pc") {
    return messages.productType.pc;
  }

  return messages.productType.unknown;
}

function createMethodId(method: RemotePaymentMethod): string {
  const methodId = toSdkworkCommerceOptionalString(method.methodId);
  if (methodId) {
    return methodId;
  }

  return (toSdkworkCommerceOptionalString(method.code) || "payment-method").toLowerCase().replaceAll("_", "-");
}

function chooseRecommendedProductType(
  productTypes: readonly SdkworkPaymentProductTypeOption[],
): SdkworkPaymentProductType {
  const available = productTypes.filter((item) => item.available);
  const preferredOrder: SdkworkPaymentProductType[] = [
    "native",
    "pc",
    "app",
    "h5",
    "jsapi",
    "miniapp",
    "online_bank",
  ];

  for (const productType of preferredOrder) {
    if (available.some((item) => item.code === productType)) {
      return productType;
    }
  }

  return available[0]?.code ?? productTypes[0]?.code ?? "unknown";
}

function mapProductTypes(
  productTypes: RemotePaymentMethodProductType[] | undefined,
  messages: SdkworkPaymentCopyContext,
): SdkworkPaymentProductTypeOption[] {
  return (productTypes ?? []).map((item) => ({
    available: item.available !== false,
    code: mapProductType(item.code),
    label: toSdkworkCommerceOptionalString(item.name) || formatProductTypeLabel(item.code, messages),
  }));
}

function mapMethod(method: RemotePaymentMethod, messages: SdkworkPaymentCopyContext): SdkworkPaymentMethod {
  const productTypes = mapProductTypes(method.productTypes, messages);

  return {
    available: method.available !== false,
    code: toSdkworkCommerceOptionalString(method.code) || "UNKNOWN",
    icon: readSdkworkMediaResource(method.methodIcon) || readSdkworkMediaResource(method.icon),
    id: createMethodId(method),
    label: toSdkworkCommerceOptionalString(method.methodName) || messages.common.payment,
    productTypes,
    recommendedProductType: chooseRecommendedProductType(productTypes),
    sort: toSdkworkCommerceNumber(method.sort),
  };
}

function sortMethods(methods: SdkworkPaymentMethod[]): SdkworkPaymentMethod[] {
  return [...methods].sort(
    (left, right) =>
      Number(right.available) - Number(left.available)
      || right.sort - left.sort
      || left.label.localeCompare(right.label),
  );
}

function derivePaymentUrl(detail: RemotePaymentDetail | null | undefined): string | undefined {
  const paymentParams = detail?.paymentParams ?? {};
  return toSdkworkCommerceOptionalString(detail?.paymentUrl)
    || toSdkworkCommerceOptionalString(paymentParams.payUrl)
    || toSdkworkCommerceOptionalString(paymentParams.mwebUrl);
}

function isQrImageLocator(value: string | undefined): boolean {
  return Boolean(value && /^(?:data:image\/|https?:\/\/).+/i.test(value));
}

function deriveQrContent(detail: RemotePaymentDetail | null | undefined): string | undefined {
  const paymentParams = detail?.paymentParams ?? {};
  const value = toSdkworkCommerceOptionalString(detail?.qrCode)
    || toSdkworkCommerceOptionalString(paymentParams.qrCode)
    || toSdkworkCommerceOptionalString(paymentParams.codeUrl);
  return isQrImageLocator(value) ? undefined : value;
}

function deriveQrImage(detail: RemotePaymentDetail | null | undefined) {
  const paymentParams = detail?.paymentParams ?? {};
  const imageResource = readSdkworkMediaResource(detail?.qrImage)
    || readSdkworkMediaResource(detail?.qrCode)
    || readSdkworkMediaResource(paymentParams.qrImage);
  if (imageResource) {
    return imageResource;
  }

  const imageLocator = [
    toSdkworkCommerceOptionalString(detail?.qrCode),
    toSdkworkCommerceOptionalString(paymentParams.qrCode),
    toSdkworkCommerceOptionalString(paymentParams.qrImage),
  ].find(isQrImageLocator);

  return toExternalSdkworkMediaResource(imageLocator, "image");
}

function mapSummary(
  payment: RemotePaymentStatus | null | undefined,
  messages: SdkworkPaymentCopyContext,
  fallback: Partial<SdkworkPaymentSummary> = {},
): SdkworkPaymentSummary {
  const status = mapPaymentStatus(toSdkworkCommerceOptionalString(payment?.status));

  return {
    amountCny: toNullableSdkworkCommerceNumber(payment?.amount) ?? fallback.amountCny ?? null,
    canClose: status === "default" || status === "pending",
    canReconcile: status === "default" || status === "pending" || status === "failed" || status === "timeout",
    canRefreshStatus: status === "default" || status === "pending",
    createdAt: toSdkworkCommerceOptionalString(payment?.createdAt) || fallback.createdAt || new Date(0).toISOString(),
    expireTime: toSdkworkCommerceOptionalString(payment?.expireTime) || fallback.expireTime,
    id: toSdkworkCommerceOptionalString(payment?.paymentId) || fallback.id || "unknown-payment",
    orderId: toSdkworkCommerceOptionalString(payment?.orderId) || fallback.orderId,
    outTradeNo: toSdkworkCommerceOptionalString(payment?.outTradeNo) || fallback.outTradeNo,
    paymentMethod: toSdkworkCommerceOptionalString(payment?.paymentMethod) || fallback.paymentMethod,
    paymentProvider: toSdkworkCommerceOptionalString(payment?.paymentProvider) || fallback.paymentProvider,
    paymentProviderLabel: toSdkworkCommerceOptionalString(payment?.paymentProviderName) || fallback.paymentProviderLabel,
    paymentSn: toSdkworkCommerceOptionalString(payment?.paymentSn) || fallback.paymentSn,
    productType: mapProductType(toSdkworkCommerceOptionalString(payment?.productType) || fallback.productType),
    status,
    statusLabel: toSdkworkCommerceOptionalString(payment?.statusName) || formatStatusLabel(status, messages),
    successTime: toSdkworkCommerceOptionalString(payment?.successTime) || fallback.successTime,
    transactionId: toSdkworkCommerceOptionalString(payment?.transactionId) || fallback.transactionId,
  };
}

function mapDetail(
  payment: RemotePaymentDetail | null | undefined,
  messages: SdkworkPaymentCopyContext,
  fallback: Partial<SdkworkPaymentDetail> = {},
): SdkworkPaymentDetail {
  const summary = mapSummary(payment, messages, fallback);

  return {
    ...summary,
    needQuery: Boolean(payment?.needQuery ?? fallback.needQuery ?? summary.canRefreshStatus),
    paymentOrderId:
      toSdkworkCommerceOptionalString(payment?.paymentOrderId)
      || toSdkworkCommerceOptionalString(payment?.merchantOrderId)
      || fallback.paymentOrderId,
    paymentParams: (payment?.paymentParams ?? fallback.paymentParams ?? {}) as Record<string, unknown>,
    paymentUrl: derivePaymentUrl(payment) || fallback.paymentUrl,
    qrContent: deriveQrContent(payment) || fallback.qrContent,
    qrImage: deriveQrImage(payment) || fallback.qrImage,
    queryIntervalSeconds: toNullableSdkworkCommerceNumber(payment?.queryInterval) ?? fallback.queryIntervalSeconds ?? undefined,
    remark: toSdkworkCommerceOptionalString(payment?.remark) || fallback.remark,
    subject: toSdkworkCommerceOptionalString(payment?.subject) || fallback.subject,
  };
}

function mapStatistics(statistics: RemotePaymentStatistics | null | undefined): SdkworkPaymentStatistics {
  return {
    closedPayments: toSdkworkCommerceNumber(statistics?.closedPayments),
    failedPayments: toSdkworkCommerceNumber(statistics?.failedPayments),
    pendingPayments: toSdkworkCommerceNumber(statistics?.pendingPayments),
    successPayments: toSdkworkCommerceNumber(statistics?.successPayments),
    timeoutPayments: toSdkworkCommerceNumber(statistics?.timeoutPayments),
    totalPayments: toSdkworkCommerceNumber(statistics?.totalPayments),
  };
}

function createEmptyDashboard(clientType: SdkworkPaymentClientType): SdkworkPaymentDashboardData {
  return {
    clientType,
    digest: summarizeSdkworkPayments([]),
    methods: [],
    records: [],
    statistics: {
      closedPayments: 0,
      failedPayments: 0,
      pendingPayments: 0,
      successPayments: 0,
      timeoutPayments: 0,
      totalPayments: 0,
    },
  };
}

function resolveReconcilePayload(
  input: SdkworkPaymentReconcileInput,
  copy: SdkworkPaymentServiceCopy,
): {
  orderId?: string;
  outTradeNo?: string;
  reconcileType: "ORDER_ID" | "OUT_TRADE_NO";
} {
  if (toSdkworkCommerceOptionalString(input.orderId)) {
    return {
      orderId: toSdkworkCommerceOptionalString(input.orderId),
      outTradeNo: undefined,
      reconcileType: "ORDER_ID",
    };
  }

  if (toSdkworkCommerceOptionalString(input.outTradeNo)) {
    return {
      orderId: undefined,
      outTradeNo: toSdkworkCommerceOptionalString(input.outTradeNo),
      reconcileType: "OUT_TRADE_NO",
    };
  }

  if (input.reconcileType === "ORDER_ID") {
    throw new Error(copy.reconcileOrderIdRequired);
  }

  throw new Error(copy.reconcileInputRequired);
}

export function createSdkworkPaymentService(
  options: CreateSdkworkPaymentServiceOptions = {},
): SdkworkPaymentService {
  const messages = createSdkworkPaymentMessages(options.locale, options.messages);
  const copy = messages.service;
  const clientType = options.clientType ?? "WEB";
  const pageSize = options.pageSize ?? 20;
  const getCommerceService = () => options.commerceService ?? getSdkworkCommerceService();

  return {
    async closePayment(paymentId) {
      requireSdkworkCommerceSession(copy.signInRequired);
      await unwrapSdkworkCommerceResponse<void>(
        await getCommerceService().payments.close(paymentId),
        copy.closeFailed,
      );

      return {
        closed: true,
        paymentId,
      };
    },

    async createPayment(input) {
      requireSdkworkCommerceSession(copy.signInRequired);
      const payload = {
        amount: input.amountCny ?? undefined,
        businessOrderId: toSdkworkCommerceOptionalString(input.businessOrderId),
        businessType: toSdkworkCommerceOptionalString(input.businessType),
        clientIp: toSdkworkCommerceOptionalString(input.clientIp),
        orderId: input.orderId,
        paymentMethod: input.paymentMethod,
        paymentProvider: toSdkworkCommerceOptionalString(input.paymentProvider),
        paymentScene: toSdkworkCommerceOptionalString(input.paymentScene),
        productType: input.productType === "unknown" ? undefined : input.productType,
      };
      const result = unwrapSdkworkCommerceResponse<RemotePaymentDetail>(
        await getCommerceService().payments.create(payload),
        copy.createFailed,
      );

      return mapDetail(result, messages, {
        orderId: input.orderId,
        paymentMethod: input.paymentMethod,
        productType: input.productType,
      });
    },

    async getDashboard() {
      if (!hasSdkworkCommerceSession()) {
        return createEmptyDashboard(clientType);
      }

      const [methodsPayload, statisticsPayload, pagePayload] = await Promise.all([
        getCommerceService().payments.methods.list({ clientType }),
        getCommerceService().payments.statistics.retrieve(),
        getCommerceService().payments.records.list({
            page: 1,
            pageSize,
            sortDirection: "desc",
            sortField: "createdAt",
        }),
      ]);
      const methods = unwrapSdkworkCommerceResponse<RemotePaymentMethod[]>(
        methodsPayload,
        copy.requestFailed,
      );
      const statistics = unwrapSdkworkCommerceResponse<RemotePaymentStatistics | null>(
        statisticsPayload,
        copy.requestFailed,
      );
      const page = unwrapSdkworkCommerceResponse<RemotePageEnvelope<RemotePaymentRecord>>(
        pagePayload,
        copy.requestFailed,
      );

      const records = (page.content ?? [])
        .map((payment) => mapSummary(payment, messages))
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

      return {
        clientType,
        digest: summarizeSdkworkPayments(records),
        methods: sortMethods(methods.map((method) => mapMethod(method, messages))),
        records,
        statistics: mapStatistics(statistics),
      };
    },

    getEmptyDashboard() {
      return createEmptyDashboard(clientType);
    },

    async getPaymentDetail(paymentId) {
      requireSdkworkCommerceSession(copy.signInRequired);
      const result = unwrapSdkworkCommerceResponse<RemotePaymentDetail>(
        await getCommerceService().payments.records.retrieve(paymentId),
        copy.detailFailed,
      );

      return mapDetail(result, messages);
    },

    async getPaymentStatus(paymentId) {
      requireSdkworkCommerceSession(copy.signInRequired);
      const result = unwrapSdkworkCommerceResponse<RemotePaymentStatus>(
        await getCommerceService().payments.status.retrieve(paymentId),
        copy.statusFailed,
      );

      return mapSummary(result, messages);
    },

    async getPaymentStatusByOutTradeNo(outTradeNo) {
      requireSdkworkCommerceSession(copy.signInRequired);
      const result = unwrapSdkworkCommerceResponse<RemotePaymentStatus>(
        await getCommerceService().payments.status.retrieveByOutTradeNo(outTradeNo),
        copy.statusByOutTradeNoFailed,
      );

      return mapSummary(result, messages);
    },

    async listOrderPayments(orderId) {
      requireSdkworkCommerceSession(copy.signInRequired);
      const result = unwrapSdkworkCommerceResponse<RemotePaymentStatus[]>(
        await getCommerceService().payments.orderPayments.list(orderId),
        copy.historyFailed,
      );

      return (result ?? [])
        .map((payment) => mapSummary(payment, messages))
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    },

    async reconcilePayment(input) {
      requireSdkworkCommerceSession(copy.signInRequired);
      const payload = resolveReconcilePayload(input, copy);
      const result = unwrapSdkworkCommerceResponse<RemotePaymentStatus>(
        await getCommerceService().payments.reconcile(payload),
        copy.reconcileFailed,
      );

      return mapSummary(result, messages, {
        orderId: payload.orderId,
        outTradeNo: payload.outTradeNo,
      });
    },
  };
}

export const sdkworkPaymentService = createSdkworkPaymentService();

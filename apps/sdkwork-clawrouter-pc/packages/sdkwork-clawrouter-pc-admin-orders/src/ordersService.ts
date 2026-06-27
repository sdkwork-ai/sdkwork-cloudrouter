import { getClawRouterBackendSdkClient } from '@sdkwork/clawroutes-pc-commons/sdk-clients';

type BackendCommerceService = ReturnType<typeof getClawRouterBackendSdkClient>['commerce'];
type AdminListInput = {
  page?: number | string;
  pageSize?: number | string;
  [key: string]: unknown;
};
type CommerceOperationCommand = Record<string, unknown>;
type OrderManagementService = BackendCommerceService['orders'];
type RefundManagementService = BackendCommerceService['refunds'];
type FulfillmentService = BackendCommerceService['fulfillments'];
type OrderSdkListParams = NonNullable<Parameters<OrderManagementService['list']>[0]>;
type RefundSdkListParams = NonNullable<Parameters<RefundManagementService['list']>[0]>;
type FulfillmentSdkListParams = NonNullable<Parameters<BackendCommerceService['fulfillments']['list']>[0]>;
type ShipmentSdkListParams = NonNullable<Parameters<BackendCommerceService['shipments']['list']>[0]>;
type OrderListInput = AdminListInput | OrderSdkListParams;
type RefundListInput = AdminListInput | RefundSdkListParams;
type FulfillmentListInput = AdminListInput | FulfillmentSdkListParams;
type ShipmentListInput = AdminListInput | ShipmentSdkListParams;

export function backendOrdersList(params?: Parameters<OrderManagementService['list']>[0]): Promise<unknown>;
export function backendOrdersList(params?: AdminListInput): Promise<unknown>;
export async function backendOrdersList(params?: OrderListInput) {
  return getClawRouterBackendSdkClient().commerce.orders.list(toSdkListParams<OrderSdkListParams>(params));
}

export async function backendOrdersRetrieve(orderId: string) {
  return getClawRouterBackendSdkClient().commerce.orders.retrieve(orderId);
}

export async function backendOrdersManagementCancel(orderId: string, body: CommerceOperationCommand = {}) {
  return getClawRouterBackendSdkClient().commerce.orders.management.cancel(orderId, body);
}

export async function backendOrdersManagementClose(orderId: string, body: CommerceOperationCommand = {}) {
  return getClawRouterBackendSdkClient().commerce.orders.management.close(orderId, body);
}

export async function backendOrdersEventsList(orderId: string, params?: Parameters<BackendCommerceService['orders']['events']['list']>[1]) {
  return getClawRouterBackendSdkClient().commerce.orders.events.management.list(orderId, toSdkListParams(params));
}

export function backendRefundsList(params?: Parameters<RefundManagementService['list']>[0]): Promise<unknown>;
export function backendRefundsList(params?: AdminListInput): Promise<unknown>;
export async function backendRefundsList(params?: RefundListInput) {
  return getClawRouterBackendSdkClient().commerce.refunds.list(toSdkListParams<RefundSdkListParams>(params));
}

export async function backendRefundsRetrieve(refundId: string) {
  return getClawRouterBackendSdkClient().commerce.refunds.retrieve(refundId);
}

export async function backendRefundApprovalCreate(refundId: string, body: CommerceOperationCommand = {}) {
  void refundId;
  void body;
  missingCommerceDependencyOperation('refunds.approvals.create');
}

export async function backendRefundAttemptCreate(refundId: string, body: CommerceOperationCommand = {}) {
  void refundId;
  void body;
  missingCommerceDependencyOperation('refunds.attempts.create');
}

export function backendFulfillmentsList(params?: Parameters<FulfillmentService['list']>[0]): Promise<unknown>;
export function backendFulfillmentsList(params?: AdminListInput): Promise<unknown>;
export async function backendFulfillmentsList(params?: FulfillmentListInput) {
  return getClawRouterBackendSdkClient().commerce.fulfillments.list(toSdkListParams<FulfillmentSdkListParams>(params));
}

export async function backendFulfillmentCreate(body: CommerceOperationCommand = {}) {
  void body;
  missingCommerceDependencyOperation('fulfillments.create');
}

export async function backendFulfillmentUpdate(fulfillmentId: string, body: CommerceOperationCommand = {}) {
  return getClawRouterBackendSdkClient().commerce.fulfillments.update(fulfillmentId, body);
}

export async function backendFulfillmentShipmentCreate(fulfillmentId: string, body: CommerceOperationCommand = {}) {
  void fulfillmentId;
  void body;
  missingCommerceDependencyOperation('fulfillments.shipments.create');
}

export async function backendFulfillmentShipmentUpdate(
  fulfillmentId: string,
  shipmentId: string,
  body: CommerceOperationCommand = {},
) {
  void fulfillmentId;
  void shipmentId;
  void body;
  missingCommerceDependencyOperation('fulfillments.shipments.update');
}

export async function backendFulfillmentTrackingEventCreate(
  fulfillmentId: string,
  shipmentId: string,
  body: CommerceOperationCommand = {},
) {
  void fulfillmentId;
  void shipmentId;
  void body;
  missingCommerceDependencyOperation('fulfillments.trackingEvents.create');
}

export function backendShipmentsList(params?: Parameters<BackendCommerceService['shipments']['list']>[0]): Promise<unknown>;
export function backendShipmentsList(params?: AdminListInput): Promise<unknown>;
export async function backendShipmentsList(params?: ShipmentListInput) {
  return getClawRouterBackendSdkClient().commerce.shipments.list(toSdkListParams<ShipmentSdkListParams>(params));
}

export async function backendShipmentsRetrieve(shipmentId: string) {
  return getClawRouterBackendSdkClient().commerce.shipments.management.retrieve(shipmentId);
}

export async function backendShipmentsTrackingEventsList(
  shipmentId: string,
) {
  return getClawRouterBackendSdkClient().commerce.shipments.trackingEvents.list(shipmentId);
}

function toSdkListParams<T extends object>(params: AdminListInput | T | undefined): T | undefined {
  if (!params) {
    return undefined;
  }
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [
        key,
        key === 'page' || key === 'pageSize'
          ? normalizeSdkPageNumber(value, key)
          : value,
      ]),
  ) as T;
}

function normalizeSdkPageNumber(value: unknown, key: string): number {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number.parseInt(value.trim(), 10)
      : Number.NaN;
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${key} must be a positive integer`);
  }
  return parsed;
}

function missingCommerceDependencyOperation(operation: string): never {
  throw new Error(
    `${operation} is not exposed by sdkwork-commerce backend SDK; update the owning commerce contract and regenerate the dependency SDK before enabling this action.`,
  );
}

import { createIdempotencyParams } from '@sdkwork/cloudroutes-pc-commons/idempotency';
import { getCloudRouterBackendSdkClient } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import type {
  CreateUpstreamSupplierRechargeOrderRequest,
  UpstreamRechargeOrder,
  UpstreamSupplierRechargeOverview,
} from '@sdkwork/cloudrouter-pc-admin-core/sdk';

/**
 * Reads a relay's live recharge balance and package catalog through the
 * management API. The browser never contacts the relay itself: the backend
 * resolves the supplier's API key and performs the API-key exchange.
 */
export async function getUpstreamSupplierRecharge(
  supplierId: string,
): Promise<UpstreamSupplierRechargeOverview> {
  return getCloudRouterBackendSdkClient().ai.upstreamSuppliers.recharge.retrieve(supplierId);
}

/**
 * Creates a recharge order on the relay. The package or custom amount is
 * quoted by the relay; this call returns the cashier link and QR payload.
 */
export async function createUpstreamSupplierRechargeOrder(
  supplierId: string,
  input: CreateUpstreamSupplierRechargeOrderRequest,
): Promise<UpstreamRechargeOrder> {
  return getCloudRouterBackendSdkClient().ai.upstreamSuppliers.recharge.orders.create(
    supplierId,
    input,
    createIdempotencyParams('upstream-supplier-recharge-order'),
  );
}

/** Polls one relay recharge order owned by the same API key. */
export async function getUpstreamSupplierRechargeOrder(
  supplierId: string,
  orderId: string,
): Promise<UpstreamRechargeOrder> {
  return getCloudRouterBackendSdkClient().ai.upstreamSuppliers.recharge.orders.retrieve(
    supplierId,
    orderId,
  );
}

export const supplierRechargeService = {
  getUpstreamSupplierRecharge,
  createUpstreamSupplierRechargeOrder,
  getUpstreamSupplierRechargeOrder,
};

import type { SdkworkAppClient } from '@sdkwork/order-app-sdk';
import {
  configureOrderMobileRuntime,
  type PaymentRegion,
} from '@sdkwork/order-mobile-react-orders';

/**
 * Deployment region the cashier offers payment methods for.
 *
 * The order backend accepts the CN wire methods (`wechat_pay`, `alipay`,
 * `balance`) only, so the overseas matrix (PayPal/card) must not flip on from
 * the payer language (`ORDER_PAYMENT_METHODS_OVERSEAS` would fail server-side).
 */
export const CLOUDROUTER_ORDER_PAYMENT_REGION: PaymentRegion = 'cn';

export interface ConfigureCloudRouterOrderRuntimeInput {
  readonly client: SdkworkAppClient;
  readonly paymentRegion?: PaymentRegion;
}

/**
 * The bootstrap-built Order App SDK client.
 *
 * Held so host-owned surfaces (the anonymous cashier) can call the same client
 * instead of constructing their own: `APP_SDK_INTEGRATION_SPEC.md` forbids feature
 * packages creating SDK clients or raw HTTP transports.
 */
let orderAppClient: SdkworkAppClient | null = null;

/**
 * Injects the bootstrap-built Order App SDK client into the order-owned mobile
 * runtime (`OrderService` plus the cashier pages).
 *
 * The Cloud Router H5 bootstrap owns SDK construction; order UI packages never
 * create SDK clients or raw HTTP transports themselves.
 */
export function configureCloudRouterOrderRuntime({
  client,
  paymentRegion = CLOUDROUTER_ORDER_PAYMENT_REGION,
}: ConfigureCloudRouterOrderRuntimeInput): void {
  orderAppClient = client;
  configureOrderMobileRuntime({ client, paymentRegion });
}

/**
 * Returns the configured Order App SDK client.
 *
 * Throws when the host bootstrap has not run: a cashier page that silently
 * degraded to an empty client would show a payable order as unpayable.
 */
export function requireCloudRouterOrderAppClient(): SdkworkAppClient {
  if (!orderAppClient) {
    throw new Error('CloudRouter order runtime is not configured before first use.');
  }
  return orderAppClient;
}

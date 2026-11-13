/**
 * Canonical Cloud Router H5 order/cashier route manifest.
 *
 * Paths are the host-overridden order routes used by `sdkwork-im-h5`, which
 * keeps one URL shape across every SDKWork host:
 *
 * - `/cashier/:orderId` is the unified cashier entry emitted by the order and
 *   payment backends (`build_commerce_cashier_url` →
 *   `{h5BaseUrl}/cashier/{orderId}?scene=..&outTradeNo=..`), and
 * - `/me/orders/...` is the order center/detail/cashier flow reached from the
 *   authenticated order surfaces.
 *
 * Route ids follow the order owner manifest
 * (`@sdkwork/order-mobile-react-orders` `ORDER_MOBILE_ROUTE_DEFINITIONS`), so
 * navigation, telemetry, and deep links stay comparable across hosts.
 */

export interface CloudRouterH5OrderRouteDefinition {
  readonly id: string;
  readonly path: string;
  readonly screen: string;
  readonly titleKey: string;
}

export const CLOUDROUTER_H5_ORDER_ROUTES = {
  orderCenter: {
    id: 'app.commerce.orders.center',
    path: '/me/orders',
    screen: 'center',
    titleKey: 'orders.title',
  },
  orderDetail: {
    id: 'app.commerce.orders.detail',
    path: '/me/orders/:orderId',
    screen: 'detail',
    titleKey: 'orders.detail_title',
  },
  orderCashier: {
    id: 'app.commerce.orders.cashier',
    path: '/me/orders/:orderId/cashier',
    screen: 'cashier',
    titleKey: 'orders.cashier_title',
  },
  /** Unified cashier entry: QR/external deep link (`/cashier/:orderId`). */
  cashierEntry: {
    id: 'app.commerce.orders.cashier-entry',
    path: '/cashier/:orderId',
    screen: 'entry',
    titleKey: 'orders.cashier_title',
  },
  refundRequests: {
    id: 'app.commerce.orders.refunds',
    path: '/me/orders/refunds',
    screen: 'refunds',
    titleKey: 'orders.refund_title',
  },
} as const satisfies Readonly<Record<string, CloudRouterH5OrderRouteDefinition>>;

export type CloudRouterH5OrderRouteKey = keyof typeof CLOUDROUTER_H5_ORDER_ROUTES;

/** Every order/cashier route this host mounts, in declaration order. */
export const CLOUDROUTER_H5_ORDER_ROUTE_LIST: readonly CloudRouterH5OrderRouteDefinition[] =
  Object.values(CLOUDROUTER_H5_ORDER_ROUTES);

/** Path prefixes adopted from a real navigation into the hash router. */
export const CLOUDROUTER_H5_ORDER_DEEP_LINK_PREFIXES = [
  '/cashier/',
  '/me/orders',
] as const;

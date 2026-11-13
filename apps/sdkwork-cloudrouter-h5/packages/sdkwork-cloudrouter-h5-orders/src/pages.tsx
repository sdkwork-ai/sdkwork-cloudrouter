import {
  CashierPage,
  OrderCenter,
  OrderDetail,
  RefundRequestsPage,
} from '@sdkwork/order-mobile-react-orders';
import type { SdkworkConsoleLocale } from '@sdkwork/cloudrouter-h5-i18n';

import { CloudRouterOrdersI18nProvider } from './OrdersI18nProvider.js';
import { CLOUDROUTER_H5_ORDER_ROUTES } from './routes.js';

export interface CloudRouterOrderPageProps {
  readonly locale: SdkworkConsoleLocale;
}

/**
 * Host adapters for the order-owned mobile surfaces.
 *
 * Each adapter only injects the Cloud Router route templates and the console
 * locale; the page logic, cashier state machine, and SDK calls stay owned by
 * `@sdkwork/order-mobile-react-orders`.
 */
export function CloudRouterOrderCenterPage({ locale }: CloudRouterOrderPageProps) {
  return (
    <CloudRouterOrdersI18nProvider locale={locale}>
      <OrderCenter
        orderCashierPath={CLOUDROUTER_H5_ORDER_ROUTES.orderCashier.path}
        orderDetailPath={CLOUDROUTER_H5_ORDER_ROUTES.orderDetail.path}
      />
    </CloudRouterOrdersI18nProvider>
  );
}

export function CloudRouterOrderDetailPage({ locale }: CloudRouterOrderPageProps) {
  return (
    <CloudRouterOrdersI18nProvider locale={locale}>
      <OrderDetail
        orderCashierPath={CLOUDROUTER_H5_ORDER_ROUTES.orderCashier.path}
        refundRequestsPath={CLOUDROUTER_H5_ORDER_ROUTES.refundRequests.path}
      />
    </CloudRouterOrdersI18nProvider>
  );
}

export function CloudRouterCashierPage({ locale }: CloudRouterOrderPageProps) {
  return (
    <CloudRouterOrdersI18nProvider locale={locale}>
      <CashierPage
        orderCenterPath={CLOUDROUTER_H5_ORDER_ROUTES.orderCenter.path}
        orderDetailPath={CLOUDROUTER_H5_ORDER_ROUTES.orderDetail.path}
      />
    </CloudRouterOrdersI18nProvider>
  );
}

export function CloudRouterRefundRequestsPage({ locale }: CloudRouterOrderPageProps) {
  return (
    <CloudRouterOrdersI18nProvider locale={locale}>
      <RefundRequestsPage />
    </CloudRouterOrdersI18nProvider>
  );
}

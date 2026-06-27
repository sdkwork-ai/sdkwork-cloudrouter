import { getClawRouterBackendSdkClient } from '@sdkwork/clawroutes-pc-commons/sdk-clients';

type BackendCommerceService = ReturnType<typeof getClawRouterBackendSdkClient>['commerce'];

export async function backendInvoicesTitlesList(params?: Parameters<BackendCommerceService['invoices']['titles']['list']>[0]) {
  return getClawRouterBackendSdkClient().commerce.invoices.titles.list(params);
}

export async function backendInvoicesList(params?: Parameters<BackendCommerceService['invoices']['list']>[0]) {
  return getClawRouterBackendSdkClient().commerce.invoices.list(params);
}

export async function backendInvoicesRetrieve(invoiceId: string) {
  return getClawRouterBackendSdkClient().commerce.invoices.retrieve(invoiceId);
}

export async function backendCommerceReportsPaymentReconciliationRetrieve() {
  return getClawRouterBackendSdkClient().commerce.commerceReports.paymentReconciliation.retrieve();
}

export async function backendCommerceReportsOrderRevenueList(
  params?: Parameters<BackendCommerceService['commerceReports']['orderRevenue']['list']>[0],
) {
  return getClawRouterBackendSdkClient().commerce.commerceReports.orderRevenue.list(params);
}

export async function backendCommerceReportsRefundsList(params?: Parameters<BackendCommerceService['commerceReports']['refunds']['list']>[0]) {
  return getClawRouterBackendSdkClient().commerce.commerceReports.refunds.list(params);
}

export async function backendAuditCommerceEventsList(params?: Parameters<BackendCommerceService['audit']['commerceEvents']['list']>[0]) {
  return getClawRouterBackendSdkClient().commerce.audit.commerceEvents.list(params);
}

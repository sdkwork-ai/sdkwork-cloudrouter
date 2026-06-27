import { getClawRouterBackendSdkClient } from '@sdkwork/clawroutes-pc-commons/sdk-clients';
import { createClientOperationToken } from '@sdkwork/clawroutes-pc-commons/runtime';

type BackendCommerceService = ReturnType<typeof getClawRouterBackendSdkClient>['commerce'];
export type PaymentProviderAccountMutationInput = Parameters<BackendCommerceService['payments']['providerAccounts']['create']>[0];
export type PaymentProviderAccountStatusUpdateInput = Parameters<BackendCommerceService['payments']['providerAccounts']['status']['update']>[1];

export async function backendPaymentsProvidersList(params?: Parameters<BackendCommerceService['payments']['providers']['list']>[0]) {
  return getClawRouterBackendSdkClient().commerce.payments.providers.list(params);
}

export async function backendPaymentsProviderAccountsList(
  params?: Parameters<BackendCommerceService['payments']['providerAccounts']['list']>[0],
) {
  return getClawRouterBackendSdkClient().commerce.payments.providerAccounts.list(params);
}

export async function backendPaymentsProviderAccountsCreate(input: PaymentProviderAccountMutationInput) {
  const body: PaymentProviderAccountMutationInput = {
    ...input,
    clientRequestNo: input.clientRequestNo ?? createClientOperationToken('payment-provider-account'),
  };
  return getClawRouterBackendSdkClient().commerce.payments.providerAccounts.create(body);
}

export async function backendPaymentsProviderAccountsUpdate(
  providerAccountId: string,
  input: PaymentProviderAccountMutationInput,
) {
  const body: PaymentProviderAccountMutationInput = {
    ...input,
    clientRequestNo: input.clientRequestNo ?? createClientOperationToken('payment-provider-account-update'),
  };
  return getClawRouterBackendSdkClient().commerce.payments.providerAccounts.update(
    providerAccountId,
    body,
  );
}

export async function backendPaymentsProviderAccountsDelete(providerAccountId: string) {
  return getClawRouterBackendSdkClient().commerce.payments.providerAccounts.delete(providerAccountId);
}

export async function backendPaymentsProviderAccountsStatusUpdate(
  providerAccountId: string,
  input: PaymentProviderAccountStatusUpdateInput,
) {
  const body: PaymentProviderAccountStatusUpdateInput = {
    ...input,
    clientRequestNo: input.clientRequestNo ?? createClientOperationToken('payment-provider-account-status'),
  };
  return getClawRouterBackendSdkClient().commerce.payments.providerAccounts.status.update(
    providerAccountId,
    body,
  );
}

export async function backendPaymentsMethodsList(params?: Parameters<BackendCommerceService['payments']['methods']['list']>[0]) {
  return getClawRouterBackendSdkClient().commerce.payments.methods.list(params);
}

export async function backendPaymentsChannelsList(params?: Parameters<BackendCommerceService['payments']['channels']['list']>[0]) {
  return getClawRouterBackendSdkClient().commerce.payments.channels.list(params);
}

export async function backendPaymentsRouteRulesList(params?: Parameters<BackendCommerceService['payments']['routeRules']['list']>[0]) {
  return getClawRouterBackendSdkClient().commerce.payments.routeRules.list(params);
}

export async function backendPaymentsRuntimeSnapshotRetrieve(
  params?: Parameters<BackendCommerceService['payments']['runtime']['snapshot']['retrieve']>[0],
) {
  return getClawRouterBackendSdkClient().commerce.payments.runtime.snapshot.retrieve(params);
}

export async function backendPaymentsIntentsList(params?: Parameters<BackendCommerceService['payments']['intents']['list']>[0]) {
  return getClawRouterBackendSdkClient().commerce.payments.intents.list(params);
}

export async function backendPaymentsAttemptsList(params?: Parameters<BackendCommerceService['payments']['attempts']['list']>[0]) {
  return getClawRouterBackendSdkClient().commerce.payments.attempts.list(params);
}

export async function backendPaymentsWebhookEventsList(params?: Parameters<BackendCommerceService['payments']['webhookEvents']['list']>[0]) {
  return getClawRouterBackendSdkClient().commerce.payments.webhookEvents.list(params);
}

export async function backendPaymentsReconciliationRunsList(
  params?: Parameters<BackendCommerceService['payments']['reconciliationRuns']['list']>[0],
) {
  return getClawRouterBackendSdkClient().commerce.payments.reconciliationRuns.list(params);
}

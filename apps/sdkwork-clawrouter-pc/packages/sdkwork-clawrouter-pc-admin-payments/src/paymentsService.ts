import { getClawRouterBackendSdkClient } from '@sdkwork/clawroutes-pc-commons/sdk-clients';
import { createClientOperationToken } from '@sdkwork/clawroutes-pc-commons/runtime';

type BackendPaymentsService = ReturnType<typeof getClawRouterBackendSdkClient>['payments'];
export type PaymentProviderAccountMutationInput = Parameters<BackendPaymentsService['providerAccounts']['create']>[0];
export type PaymentProviderAccountStatusUpdateInput = Parameters<BackendPaymentsService['providerAccounts']['status']['update']>[1];

export async function backendPaymentsProvidersList(params?: Parameters<BackendPaymentsService['providers']['list']>[0]) {
  return getClawRouterBackendSdkClient().payments.providers.list(params);
}

export async function backendPaymentsProviderAccountsList(
  params?: Parameters<BackendPaymentsService['providerAccounts']['list']>[0],
) {
  return getClawRouterBackendSdkClient().payments.providerAccounts.list(params);
}

export async function backendPaymentsProviderAccountsCreate(input: PaymentProviderAccountMutationInput) {
  const body: PaymentProviderAccountMutationInput = {
    ...input,
    clientRequestNo: input.clientRequestNo ?? createClientOperationToken('payment-provider-account'),
  };
  return getClawRouterBackendSdkClient().payments.providerAccounts.create(body, {
    idempotencyKey: createClientOperationToken('payment-provider-account-command'),
  });
}

export async function backendPaymentsProviderAccountsUpdate(
  providerAccountId: string,
  input: PaymentProviderAccountMutationInput,
) {
  const body: PaymentProviderAccountMutationInput = {
    ...input,
    clientRequestNo: input.clientRequestNo ?? createClientOperationToken('payment-provider-account-update'),
  };
  return getClawRouterBackendSdkClient().payments.providerAccounts.update(
    providerAccountId,
    body,
    { idempotencyKey: createClientOperationToken('payment-provider-account-update-command') },
  );
}

export async function backendPaymentsProviderAccountsDelete(providerAccountId: string) {
  return getClawRouterBackendSdkClient().payments.providerAccounts.delete(providerAccountId);
}

export async function backendPaymentsProviderAccountsStatusUpdate(
  providerAccountId: string,
  input: PaymentProviderAccountStatusUpdateInput,
) {
  const body: PaymentProviderAccountStatusUpdateInput = {
    ...input,
    clientRequestNo: input.clientRequestNo ?? createClientOperationToken('payment-provider-account-status'),
  };
  return getClawRouterBackendSdkClient().payments.providerAccounts.status.update(
    providerAccountId,
    body,
    { idempotencyKey: createClientOperationToken('payment-provider-account-status-command') },
  );
}

export async function backendPaymentsMethodsList(params?: Parameters<BackendPaymentsService['methods']['management']['list']>[0]) {
  return getClawRouterBackendSdkClient().payments.methods.management.list(params);
}

export async function backendPaymentsChannelsList(params?: Parameters<BackendPaymentsService['channels']['list']>[0]) {
  return getClawRouterBackendSdkClient().payments.channels.list(params);
}

export async function backendPaymentsRouteRulesList(params?: Parameters<BackendPaymentsService['routeRules']['list']>[0]) {
  return getClawRouterBackendSdkClient().payments.routeRules.list(params);
}

export async function backendPaymentsRuntimeSnapshotRetrieve(
  params?: Parameters<BackendPaymentsService['runtime']['snapshot']['retrieve']>[0],
) {
  return getClawRouterBackendSdkClient().payments.runtime.snapshot.retrieve(params);
}

export async function backendPaymentsIntentsList(params?: Parameters<BackendPaymentsService['intents']['list']>[0]) {
  return getClawRouterBackendSdkClient().payments.intents.list(params);
}

export async function backendPaymentsAttemptsList(params?: Parameters<BackendPaymentsService['attempts']['list']>[0]) {
  return getClawRouterBackendSdkClient().payments.attempts.list(params);
}

export async function backendPaymentsWebhookEventsList(params?: Parameters<BackendPaymentsService['webhookEvents']['list']>[0]) {
  return getClawRouterBackendSdkClient().payments.webhookEvents.list(params);
}

export async function backendPaymentsReconciliationRunsList(
  params?: Parameters<BackendPaymentsService['reconciliationRuns']['list']>[0],
) {
  return getClawRouterBackendSdkClient().payments.reconciliationRuns.list(params);
}

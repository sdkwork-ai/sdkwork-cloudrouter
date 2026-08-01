import {
  getClawRouterBackendSdkClient,
  getSdkworkPaymentBackendSdkClient,
} from '@sdkwork/clawroutes-pc-commons/sdk-clients';

type BackendPaymentsService = ReturnType<typeof getSdkworkPaymentBackendSdkClient>['payments'];
type ClawBackendPaymentsService = ReturnType<typeof getClawRouterBackendSdkClient>['payments'];

export async function backendPaymentsProvidersList(params?: Parameters<ClawBackendPaymentsService['providers']['list']>[0]) {
  return getClawRouterBackendSdkClient().payments.providers.list(params);
}

export async function backendPaymentsMethodsList(params?: Parameters<BackendPaymentsService['methods']['list']>[0]) {
  return getSdkworkPaymentBackendSdkClient().payments.methods.list(params);
}

export async function backendPaymentsChannelsList(params?: Parameters<BackendPaymentsService['channels']['list']>[0]) {
  return getSdkworkPaymentBackendSdkClient().payments.channels.list(params);
}

export async function backendPaymentsRouteRulesList(params?: Parameters<BackendPaymentsService['routeRules']['list']>[0]) {
  return getSdkworkPaymentBackendSdkClient().payments.routeRules.list(params);
}

export async function backendPaymentsIntentsList(params?: Parameters<BackendPaymentsService['intents']['list']>[0]) {
  return getSdkworkPaymentBackendSdkClient().payments.intents.list(params);
}

export async function backendPaymentsAttemptsList(params?: Parameters<BackendPaymentsService['attempts']['list']>[0]) {
  return getSdkworkPaymentBackendSdkClient().payments.attempts.list(params);
}

export async function backendPaymentsWebhookEventsList(params?: Parameters<BackendPaymentsService['webhookEvents']['list']>[0]) {
  return getSdkworkPaymentBackendSdkClient().payments.webhookEvents.list(params);
}

export async function backendPaymentsReconciliationRunsList(
  params?: Parameters<BackendPaymentsService['reconciliationRuns']['list']>[0],
) {
  return getSdkworkPaymentBackendSdkClient().payments.reconciliationRuns.list(params);
}

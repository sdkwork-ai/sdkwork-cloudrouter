import {
  getCloudRouterBackendSdkClient,
  getSdkworkPaymentBackendSdkClient,
} from '@sdkwork/cloudroutes-pc-commons/sdk-clients';

type BackendPaymentsService = ReturnType<typeof getSdkworkPaymentBackendSdkClient>['payments'];
type CloudBackendPaymentsService = ReturnType<typeof getCloudRouterBackendSdkClient>['payments'];

export async function backendPaymentsProvidersList(params?: Parameters<CloudBackendPaymentsService['providers']['list']>[0]) {
  return getCloudRouterBackendSdkClient().payments.providers.list(params);
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

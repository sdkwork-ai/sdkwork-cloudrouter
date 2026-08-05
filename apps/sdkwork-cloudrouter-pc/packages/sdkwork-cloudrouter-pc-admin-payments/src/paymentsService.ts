import {
  getCloudRouterBackendSdkClient,
  getSdkworkBaseDataBackendSdkClient,
  getSdkworkPaymentBackendSdkClient,
} from '@sdkwork/cloudroutes-pc-commons/sdk-clients';
import { createIdempotencyParams } from '@sdkwork/cloudroutes-pc-commons/idempotency';
import type {
  CreatePaymentChannelCommand,
  CreatePaymentMethodCommand,
  CreateReconciliationRunCommand,
  CreateRefundCommand,
  CreateRouteRuleCommand,
  CreateTestPaymentCommand,
  PaymentIntent,
  Refund,
  RetryRefundCommand,
  SandboxTriggerCommand,
  TestPayment,
  UpdatePaymentMethodCommand,
  UpdateRouteRuleCommand,
} from '@sdkwork/payment-backend-sdk';

type BackendPaymentsService = ReturnType<typeof getSdkworkPaymentBackendSdkClient>['payments'];
type CloudBackendPaymentsService = ReturnType<typeof getCloudRouterBackendSdkClient>['payments'];
type BackendBaseDataService = ReturnType<typeof getSdkworkBaseDataBackendSdkClient>['baseData'];

export type { CreatePaymentChannelCommand as PaymentChannelCreateInput } from '@sdkwork/payment-backend-sdk';
export type { CreatePaymentMethodCommand as PaymentMethodCreateInput } from '@sdkwork/payment-backend-sdk';
export type { UpdatePaymentMethodCommand as PaymentMethodUpdateInput } from '@sdkwork/payment-backend-sdk';
export type { CreateReconciliationRunCommand as ReconciliationRunCreateInput } from '@sdkwork/payment-backend-sdk';
export type { CreateRefundCommand as RefundCreateInput } from '@sdkwork/payment-backend-sdk';
export type { RetryRefundCommand as RefundRetryInput } from '@sdkwork/payment-backend-sdk';
export type { CreateRouteRuleCommand as RouteRuleCreateInput } from '@sdkwork/payment-backend-sdk';
export type { UpdateRouteRuleCommand as RouteRuleUpdateInput } from '@sdkwork/payment-backend-sdk';

export async function backendPaymentsProvidersList(params?: Parameters<CloudBackendPaymentsService['providers']['list']>[0]) {
  return getCloudRouterBackendSdkClient().payments.providers.list(params);
}

export async function backendPaymentProviderAccountsList(
  params?: Parameters<BackendPaymentsService['providerAccounts']['list']>[0],
) {
  return getSdkworkPaymentBackendSdkClient().payments.providerAccounts.list(params);
}

export async function backendPaymentsMethodsList(params?: Parameters<BackendPaymentsService['methods']['list']>[0]) {
  return getSdkworkPaymentBackendSdkClient().payments.methods.list(params);
}

export async function backendPaymentMethodsCreate(body: CreatePaymentMethodCommand) {
  return getSdkworkPaymentBackendSdkClient().payments.methods.create(body, createIdempotencyParams('payment-method-create'));
}

export async function backendPaymentMethodsUpdate(methodKey: string, body: UpdatePaymentMethodCommand) {
  return getSdkworkPaymentBackendSdkClient().payments.methods.update(methodKey, body, createIdempotencyParams('payment-method-update'));
}

export async function backendPaymentsChannelsList(params?: Parameters<BackendPaymentsService['channels']['list']>[0]) {
  return getSdkworkPaymentBackendSdkClient().payments.channels.list(params);
}

export async function backendPaymentChannelsCreate(body: CreatePaymentChannelCommand) {
  return getSdkworkPaymentBackendSdkClient().payments.channels.create(body, createIdempotencyParams('payment-channel-create'));
}

export async function backendPaymentsRouteRulesList(params?: Parameters<BackendPaymentsService['routeRules']['list']>[0]) {
  return getSdkworkPaymentBackendSdkClient().payments.routeRules.list(params);
}

export async function backendPaymentRouteRulesCreate(body: CreateRouteRuleCommand) {
  return getSdkworkPaymentBackendSdkClient().payments.routeRules.create(body, createIdempotencyParams('payment-route-rule-create'));
}

export async function backendPaymentRouteRulesUpdate(routeRuleId: string, body: UpdateRouteRuleCommand) {
  return getSdkworkPaymentBackendSdkClient().payments.routeRules.update(routeRuleId, body, createIdempotencyParams('payment-route-rule-update'));
}

export async function backendPaymentRouteRulesDelete(routeRuleId: string) {
  return getSdkworkPaymentBackendSdkClient().payments.routeRules.delete(routeRuleId);
}

export async function backendPaymentsIntentsList(params?: Parameters<BackendPaymentsService['intents']['list']>[0]) {
  return getSdkworkPaymentBackendSdkClient().payments.intents.list(params);
}

export async function backendPaymentIntentsRetrieve(paymentIntentId: string): Promise<PaymentIntent> {
  return getSdkworkPaymentBackendSdkClient().payments.intents.retrieve(paymentIntentId);
}

export async function backendPaymentsAttemptsList(params?: Parameters<BackendPaymentsService['attempts']['list']>[0]) {
  return getSdkworkPaymentBackendSdkClient().payments.attempts.list(params);
}

export async function backendPaymentsWebhookEventsList(params?: Parameters<BackendPaymentsService['webhookEvents']['list']>[0]) {
  return getSdkworkPaymentBackendSdkClient().payments.webhookEvents.list(params);
}

export async function backendPaymentWebhookEventsReplay(eventId: string) {
  return getSdkworkPaymentBackendSdkClient().payments.webhookEvents.replay(eventId);
}

export async function backendPaymentsReconciliationRunsList(
  params?: Parameters<BackendPaymentsService['reconciliationRuns']['list']>[0],
) {
  return getSdkworkPaymentBackendSdkClient().payments.reconciliationRuns.list(params);
}

export async function backendPaymentReconciliationRunsCreate(body: CreateReconciliationRunCommand) {
  return getSdkworkPaymentBackendSdkClient().payments.reconciliationRuns.create(body, createIdempotencyParams('reconciliation-run-create'));
}

export async function backendPaymentDevSandboxTrigger(body: SandboxTriggerCommand) {
  return getSdkworkPaymentBackendSdkClient().payments.dev.sandboxTrigger(body, createIdempotencyParams('dev-sandbox-trigger'));
}

export async function backendPaymentDevTestPayment(body: CreateTestPaymentCommand): Promise<TestPayment> {
  return getSdkworkPaymentBackendSdkClient().payments.dev.testPayments(
    body,
    createIdempotencyParams('test-payment'),
  );
}

// ---------------------------------------------------------------------------
// Refund management (payment capability backend surface)
// ---------------------------------------------------------------------------

export async function backendPaymentsRefundsList(
  params?: Parameters<BackendPaymentsService['refunds']['list']>[0],
) {
  return getSdkworkPaymentBackendSdkClient().payments.refunds.list(params);
}

export async function backendPaymentRefundsRetrieve(refundId: string): Promise<Refund> {
  return getSdkworkPaymentBackendSdkClient().payments.refunds.retrieve(refundId);
}

export async function backendPaymentRefundsCreate(body: CreateRefundCommand, idempotencyKey: string): Promise<Refund> {
  return getSdkworkPaymentBackendSdkClient().payments.refunds.create(body, { idempotencyKey });
}

export async function backendPaymentRefundsRetry(refundId: string, body: RetryRefundCommand, idempotencyKey: string) {
  return getSdkworkPaymentBackendSdkClient().payments.refunds.retry(refundId, body, { idempotencyKey });
}

// ---------------------------------------------------------------------------
// Base-data reads (currencies/countries/dictionary served by the
// sdkwork-appbase base-data capability)
// ---------------------------------------------------------------------------

export async function backendBaseDataCurrenciesList(params?: Parameters<BackendBaseDataService['currencies']['list']>[0]) {
  return getSdkworkBaseDataBackendSdkClient().baseData.currencies.list(params);
}

export async function backendBaseDataCountriesList(params?: Parameters<BackendBaseDataService['countries']['list']>[0]) {
  return getSdkworkBaseDataBackendSdkClient().baseData.countries.list(params);
}

export async function backendBaseDataDictionariesList(params: Parameters<BackendBaseDataService['dictionaries']['list']>[0]) {
  return getSdkworkBaseDataBackendSdkClient().baseData.dictionaries.list(params);
}

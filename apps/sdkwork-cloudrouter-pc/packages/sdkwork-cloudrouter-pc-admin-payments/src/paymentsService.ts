import {
  getCloudRouterBackendSdkClient,
  getSdkworkBaseDataBackendSdkClient,
  getSdkworkPaymentBackendSdkClient,
} from '@sdkwork/cloudroutes-pc-commons/sdk-clients';
import { createIdempotencyParams } from '@sdkwork/cloudroutes-pc-commons/idempotency';
import type { UpdatePaymentProviderRequest } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import type {
  CheckAttemptStatusCommand,
  CheckAttemptStatusResult,
  CreatePaymentChannelCommand,
  CreatePaymentMethodCommand,
  CreateReconciliationRunCommand,
  CreateRefundCommand,
  CreateRouteRuleCommand,
  CreateTestPaymentCommand,
  NotifyDomain,
  NotifyDomainCreateRequest,
  NotifyDomainUpdateRequest,
  PaymentDomainSetting,
  PaymentIntent,
  Refund,
  RetryRefundCommand,
  SandboxTriggerCommand,
  TestPayment,
  UpdatePaymentChannelCommand,
  UpdatePaymentDomainSettingRequest,
  UpdatePaymentMethodCommand,
  UpdateRouteRuleCommand,
} from '@sdkwork/cloudrouter-pc-admin-core/sdk';

type BackendPaymentsService = ReturnType<typeof getSdkworkPaymentBackendSdkClient>['payments'];
type CloudBackendPaymentsService = ReturnType<typeof getCloudRouterBackendSdkClient>['payments'];
type BackendBaseDataService = ReturnType<typeof getSdkworkBaseDataBackendSdkClient>['baseData'];

/** List-query shape accepted by the payment intent (payment record) list API. */
export type PaymentIntentListQuery = Parameters<BackendPaymentsService['intents']['list']>[0];
/** List-query shape accepted by the refund list API. */
export type RefundListQuery = Parameters<BackendPaymentsService['refunds']['list']>[0];
/** List-query shape accepted by the payment attempt list API. */
export type PaymentAttemptListQuery = Parameters<BackendPaymentsService['attempts']['list']>[0];
/** List-query shape accepted by the webhook event list API. */
export type WebhookEventListQuery = Parameters<BackendPaymentsService['webhookEvents']['list']>[0];
/** List-query shape accepted by the reconciliation run list API. */
export type ReconciliationRunListQuery = Parameters<BackendPaymentsService['reconciliationRuns']['list']>[0];

export type { CreatePaymentChannelCommand as PaymentChannelCreateInput } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
export type { CreatePaymentMethodCommand as PaymentMethodCreateInput } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
export type { UpdatePaymentMethodCommand as PaymentMethodUpdateInput } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
export type { CreateReconciliationRunCommand as ReconciliationRunCreateInput } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
export type { CreateRefundCommand as RefundCreateInput } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
export type { RetryRefundCommand as RefundRetryInput } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
export type { CreateRouteRuleCommand as RouteRuleCreateInput } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
export type { UpdateRouteRuleCommand as RouteRuleUpdateInput } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
export type { UpdatePaymentProviderRequest as PaymentProviderUpdateInput } from '@sdkwork/cloudrouter-pc-admin-core/sdk';

export async function backendPaymentsProvidersList(params?: Parameters<CloudBackendPaymentsService['providers']['list']>[0]) {
  return getCloudRouterBackendSdkClient().payments.providers.list(params);
}

/**
 * Provider inventory with select-filter support (status). Providers are
 * operator-managed inventory, so the status filter is the difference between
 * scrolling a long catalogue and answering "what is switched off?" — the
 * backend supports it natively, so the list is filtered server-side rather than
 * slicing an already-paged window.
 */
export async function backendPaymentsProvidersListFiltered(filters?: Record<string, string>) {
  const status = filters?.status;
  return getCloudRouterBackendSdkClient().payments.providers.list({
    status: status ? (status as 'active' | 'inactive' | 'disabled') : undefined,
  });
}

export async function backendPaymentProvidersUpdate(providerId: string, body: UpdatePaymentProviderRequest) {
  return getCloudRouterBackendSdkClient().payments.providers.update(providerId, body);
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

/** Channels list with select-filter support (provider/method/scene/status). */
export async function backendPaymentsChannelsListFiltered(filters?: Record<string, string>) {
  const active = (key: string) => {
    const value = filters?.[key];
    return value ? String(value) : undefined;
  };
  return getSdkworkPaymentBackendSdkClient().payments.channels.list({
    providerCode: active('providerCode'),
    methodId: active('methodId'),
    sceneCode: active('sceneCode') as 'app' | 'web' | 'mini_program' | 'api' | undefined,
    status: active('status') as 'active' | 'inactive' | 'deprecated' | undefined,
  });
}

export async function backendPaymentChannelsCreate(body: CreatePaymentChannelCommand) {
  return getSdkworkPaymentBackendSdkClient().payments.channels.create(body, createIdempotencyParams('payment-channel-create'));
}

export async function backendPaymentChannelsUpdate(channelId: string, body: UpdatePaymentChannelCommand) {
  return getSdkworkPaymentBackendSdkClient().payments.channels.update(channelId, body, createIdempotencyParams('payment-channel-update'));
}

export async function backendPaymentChannelsDelete(channelId: string) {
  return getSdkworkPaymentBackendSdkClient().payments.channels.delete(channelId);
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

/**
 * Attempts list with the server-side filters the backend exposes (status,
 * provider, intent). Passing them as query parameters is what makes the list
 * answer "which attempts failed on Stripe for this payment", instead of only
 * narrowing the already-loaded page in the browser.
 */
export async function backendPaymentsAttemptsListFiltered(filters?: Record<string, string>) {
  const value = (key: string) => {
    const current = filters?.[key]?.trim();
    return current ? current : undefined;
  };
  return getSdkworkPaymentBackendSdkClient().payments.attempts.list({
    status: value('status') as NonNullable<PaymentAttemptListQuery>['status'],
    providerCode: value('providerCode'),
    paymentIntentId: value('paymentIntentId'),
  });
}

export async function backendPaymentsWebhookEventsList(params?: Parameters<BackendPaymentsService['webhookEvents']['list']>[0]) {
  return getSdkworkPaymentBackendSdkClient().payments.webhookEvents.list(params);
}

/** Webhook events list with server-side status/provider/event-type filters. */
export async function backendPaymentsWebhookEventsListFiltered(filters?: Record<string, string>) {
  const value = (key: string) => {
    const current = filters?.[key]?.trim();
    return current ? current : undefined;
  };
  return getSdkworkPaymentBackendSdkClient().payments.webhookEvents.list({
    status: value('status') as NonNullable<WebhookEventListQuery>['status'],
    providerCode: value('providerCode'),
    eventType: value('eventType'),
  });
}

export async function backendPaymentWebhookEventsReplay(eventId: string) {
  return getSdkworkPaymentBackendSdkClient().payments.webhookEvents.replay(eventId);
}

export async function backendPaymentsReconciliationRunsList(
  params?: Parameters<BackendPaymentsService['reconciliationRuns']['list']>[0],
) {
  return getSdkworkPaymentBackendSdkClient().payments.reconciliationRuns.list(params);
}

/** Reconciliation runs list with server-side status/provider/account filters. */
export async function backendPaymentsReconciliationRunsListFiltered(filters?: Record<string, string>) {
  const value = (key: string) => {
    const current = filters?.[key]?.trim();
    return current ? current : undefined;
  };
  return getSdkworkPaymentBackendSdkClient().payments.reconciliationRuns.list({
    status: value('status') as NonNullable<ReconciliationRunListQuery>['status'],
    providerCode: value('providerCode'),
    providerAccountId: value('providerAccountId'),
  });
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

export async function backendPaymentDevCheckAttemptStatus(body: CheckAttemptStatusCommand): Promise<CheckAttemptStatusResult> {
  return getSdkworkPaymentBackendSdkClient().payments.dev.checkAttemptStatus(
    body,
    createIdempotencyParams('check-attempt-status'),
  );
}

// ---------------------------------------------------------------------------
// Payment domain settings (支付设置 → 域名设置)
// ---------------------------------------------------------------------------

/** Reads the tenant/organization H5 payment domain settings (never null). */
export async function backendPaymentDomainSettingRetrieve(): Promise<PaymentDomainSetting> {
  return getSdkworkPaymentBackendSdkClient().payments.domainSettings.retrieve();
}

/** Saves the H5 payment domain settings. */
export async function backendPaymentDomainSettingUpdate(
  body: UpdatePaymentDomainSettingRequest,
): Promise<PaymentDomainSetting> {
  return getSdkworkPaymentBackendSdkClient().payments.domainSettings.update(
    body,
    createIdempotencyParams('payment-domain-setting-update'),
  );
}

/** Lists the callback (notify) domains configured for the tenant scope. */
export async function backendPaymentNotifyDomainsList(params?: Parameters<BackendPaymentsService['notifyDomains']['list']>[0]) {
  return getSdkworkPaymentBackendSdkClient().payments.notifyDomains.list(params ?? { page: 1, pageSize: 200 });
}

/** Creates a callback (notify) domain. */
export async function backendPaymentNotifyDomainCreate(body: NotifyDomainCreateRequest): Promise<NotifyDomain> {
  return getSdkworkPaymentBackendSdkClient().payments.notifyDomains.create(
    body,
    createIdempotencyParams('payment-notify-domain-create'),
  );
}

/** Updates a callback (notify) domain (set default, enable/disable, rename). */
export async function backendPaymentNotifyDomainUpdate(
  domainId: string,
  body: NotifyDomainUpdateRequest,
): Promise<NotifyDomain> {
  return getSdkworkPaymentBackendSdkClient().payments.notifyDomains.update(
    domainId,
    body,
    createIdempotencyParams('payment-notify-domain-update'),
  );
}

/** Deletes a callback (notify) domain. */
export async function backendPaymentNotifyDomainDelete(domainId: string): Promise<void> {
  return getSdkworkPaymentBackendSdkClient().payments.notifyDomains.delete(domainId);
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

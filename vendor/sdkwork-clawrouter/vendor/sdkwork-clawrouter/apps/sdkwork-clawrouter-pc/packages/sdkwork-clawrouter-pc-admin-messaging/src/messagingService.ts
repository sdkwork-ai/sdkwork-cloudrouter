import {
  ensureSdkworkApiSuccess,
  getClawRouterBackendSdkClient,
  requiredSafePathSegment,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import type {
  MessagingProviderAccountCreateRequest,
  MessagingRouteRuleCreateRequest,
  MessagingRouteSimulationRequest,
  MessagingSenderIdentityCreateRequest,
  MessagingSuppressionCreateRequest,
  MessagingTemplateCreateRequest,
  MessagingTemplateSendRequest,
  MessagingTestSendRequest,
  VerificationPolicyUpdateRequest,
} from '@sdkwork/clawrouter-backend-sdk';

type BackendMessaging = ReturnType<typeof getClawRouterBackendSdkClient>['messaging'];
type ListParams<TList> = TList extends (params?: infer TParams) => unknown ? TParams : never;

export type MessagingProviderAccountListParams = ListParams<BackendMessaging['providerAccounts']['list']>;
export type MessagingSenderIdentityListParams = ListParams<BackendMessaging['senderIdentities']['list']>;
export type MessagingTemplateListParams = ListParams<BackendMessaging['templates']['list']>;
export type MessagingRouteRuleListParams = ListParams<BackendMessaging['routeRules']['list']>;
export type MessagingSendRequestListParams = ListParams<BackendMessaging['sendRequests']['list']>;
export type MessagingSuppressionListParams = ListParams<BackendMessaging['suppressions']['list']>;
export type MessagingRateLimitBucketListParams = ListParams<BackendMessaging['rateLimitBuckets']['list']>;
export type MessagingVerificationPolicyListParams = ListParams<BackendMessaging['verificationPolicies']['list']>;

export type MessagingProviderAccountCreateInput = MessagingProviderAccountCreateRequest;
export type MessagingSenderIdentityCreateInput = MessagingSenderIdentityCreateRequest;
export type MessagingTemplateCreateInput = MessagingTemplateCreateRequest;
export type MessagingRouteRuleCreateInput = MessagingRouteRuleCreateRequest;
export type MessagingRouteSimulationInput = MessagingRouteSimulationRequest;
export type MessagingTestSendInput = MessagingTestSendRequest;
export type MessagingTemplateSendInput = MessagingTemplateSendRequest;
export type MessagingSuppressionCreateInput = MessagingSuppressionCreateRequest;
export type VerificationPolicyUpdateInput = VerificationPolicyUpdateRequest;

export const DEFAULT_MESSAGING_PAGE_PARAMS = {
  page: '1',
  pageSize: '100',
} as const;

export async function listMessagingProviderAccounts(params?: MessagingProviderAccountListParams) {
  return getClawRouterBackendSdkClient().messaging.providerAccounts.list({
    ...DEFAULT_MESSAGING_PAGE_PARAMS,
    ...params,
  });
}

export async function createMessagingProviderAccount(input: MessagingProviderAccountCreateInput) {
  const result = await getClawRouterBackendSdkClient().messaging.providerAccounts.create(input);
  ensureSdkworkApiSuccess(result, 'Failed to create messaging provider account');
  return result;
}

export async function listMessagingSenderIdentities(params?: MessagingSenderIdentityListParams) {
  return getClawRouterBackendSdkClient().messaging.senderIdentities.list({
    ...DEFAULT_MESSAGING_PAGE_PARAMS,
    ...params,
  });
}

export async function createMessagingSenderIdentity(input: MessagingSenderIdentityCreateInput) {
  const result = await getClawRouterBackendSdkClient().messaging.senderIdentities.create(input);
  ensureSdkworkApiSuccess(result, 'Failed to create messaging sender identity');
  return result;
}

export async function listMessagingTemplates(params?: MessagingTemplateListParams) {
  return getClawRouterBackendSdkClient().messaging.templates.list({
    ...DEFAULT_MESSAGING_PAGE_PARAMS,
    ...params,
  });
}

export async function createMessagingTemplate(input: MessagingTemplateCreateInput) {
  const result = await getClawRouterBackendSdkClient().messaging.templates.create(input);
  ensureSdkworkApiSuccess(result, 'Failed to create messaging template');
  return result;
}

export async function publishMessagingTemplateVersion(templateId: string, versionId: string) {
  const result = await getClawRouterBackendSdkClient().messaging.templates.versions.publish(
    requiredSafePathSegment(templateId, 'templateId'),
    requiredSafePathSegment(versionId, 'versionId'),
  );
  ensureSdkworkApiSuccess(result, 'Failed to publish messaging template version');
  return result;
}

export async function listMessagingRouteRules(params?: MessagingRouteRuleListParams) {
  return getClawRouterBackendSdkClient().messaging.routeRules.list({
    ...DEFAULT_MESSAGING_PAGE_PARAMS,
    ...params,
  });
}

export async function createMessagingRouteRule(input: MessagingRouteRuleCreateInput) {
  const result = await getClawRouterBackendSdkClient().messaging.routeRules.create(input);
  ensureSdkworkApiSuccess(result, 'Failed to create messaging route rule');
  return result;
}

export async function listMessagingSendRequests(params?: MessagingSendRequestListParams) {
  return getClawRouterBackendSdkClient().messaging.sendRequests.list({
    ...DEFAULT_MESSAGING_PAGE_PARAMS,
    ...params,
  });
}

export async function simulateMessagingRoute(input: MessagingRouteSimulationInput) {
  const result = await getClawRouterBackendSdkClient().messaging.diagnostics.routeSimulation.create(input);
  ensureSdkworkApiSuccess(result, 'Failed to simulate messaging route');
  return result;
}

export async function testMessagingSend(input: MessagingTestSendInput) {
  const result = await getClawRouterBackendSdkClient().messaging.diagnostics.testSends.create(input);
  ensureSdkworkApiSuccess(result, 'Failed to test messaging send');
  return result;
}

export async function sendMessagingTemplate(input: MessagingTemplateSendInput) {
  const result = await getClawRouterBackendSdkClient().messaging.templateSends.create(input);
  ensureSdkworkApiSuccess(result, 'Failed to send messaging template');
  return result;
}

export async function listMessagingSuppressions(params?: MessagingSuppressionListParams) {
  return getClawRouterBackendSdkClient().messaging.suppressions.list({
    ...DEFAULT_MESSAGING_PAGE_PARAMS,
    ...params,
  });
}

export async function createMessagingSuppression(input: MessagingSuppressionCreateInput) {
  const result = await getClawRouterBackendSdkClient().messaging.suppressions.create(input);
  ensureSdkworkApiSuccess(result, 'Failed to create messaging suppression');
  return result;
}

export async function listMessagingRateLimitBuckets(params?: MessagingRateLimitBucketListParams) {
  return getClawRouterBackendSdkClient().messaging.rateLimitBuckets.list({
    ...DEFAULT_MESSAGING_PAGE_PARAMS,
    ...params,
  });
}

export async function listVerificationPolicies(params?: MessagingVerificationPolicyListParams) {
  return getClawRouterBackendSdkClient().messaging.verificationPolicies.list({
    ...DEFAULT_MESSAGING_PAGE_PARAMS,
    ...params,
  });
}

export async function updateVerificationPolicy(policyId: string, input: VerificationPolicyUpdateInput) {
  const result = await getClawRouterBackendSdkClient().messaging.verificationPolicies.update(
    requiredSafePathSegment(policyId, 'policyId'),
    input,
  );
  ensureSdkworkApiSuccess(result, 'Failed to update verification policy');
  return result;
}

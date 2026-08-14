export {
  getCloudRouterBackendSdkClient,
  getModelsBackendSdkClient,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
export {
  getCloudRouterPaymentBackendService,
} from '@sdkwork/cloudroutes-pc-commons/domain-service-providers';
import type { CloudRouterMediaResource } from '@sdkwork/cloudroutes-pc-commons/runtime';
import type {
  AdminAuthSettingsUpdateRequest as GeneratedAdminAuthSettingsUpdateRequest,
} from '@sdkwork/cloudrouter-backend-sdk';
export type {
  AdminFirewallRuleCreateRequest,
  AdminIpLimitCreateRequest,
  AdminModelLimitCreateRequest,
  AdminRuntimeRegionSettingsResponse,
  AdminRuntimeRegionSettingsUpdateRequest,
  AdminServiceNodeCreateRequest,
  AdminServiceNodeUpdateRequest,
  AdminSiteSettingsResponse,
  AdminSiteSettingsUpdateRequest,
  AdminTokenLimitCreateRequest,
  AiUpstreamAccountGroupsListParams,
  AiUpstreamAccountsCredentialsListParams,
  AiUpstreamAccountsListParams,
  AiUpstreamSuppliersListParams,
  ChainPolicyInput,
  CreateUpstreamAccountCredentialRequest,
  CreateUpstreamAccountGroupRequest,
  CreateUpstreamAccountRequest,
  CreateUpstreamSupplierRequest,
  ExplainUpstreamAccountGroupRouteRequest,
  LlmProtocolConfig,
  ReplaceUpstreamAccountGroupMembersRequest,
  ReplaceUpstreamAccountGroupResourcesRequest,
  ReplaceUpstreamAccountResourcesRequest,
  ReplaceUpstreamSupplierAuthMethodsRequest,
  ReplaceUpstreamSupplierEndpointsRequest,
  ReplaceUpstreamSupplierResourcesRequest,
  UpdateUpstreamAccountGroupRequest,
  UpdateUpstreamAccountRequest,
  UpdateUpstreamSupplierRequest,
  UpstreamAccountCredentialListResponse,
  UpstreamAccountGroupListResponse,
  UpstreamAccount,
  UpstreamAccountCredential,
  UpstreamAccountGroup,
  UpstreamAccountGroupMember,
  UpstreamAccountGroupMemberInput,
  UpstreamAccountGroupModelListEntry,
  UpstreamAccountGroupRouteExplanation,
  UpstreamAccountVerification,
  UpstreamAccountListResponse,
  UpstreamResourceCatalogItem,
  UpstreamResourceCatalogResponse,
  UpstreamResourceEntitlement,
  UpstreamResourceEntitlementInput,
  UpstreamResourceGroupCatalogItem,
  UpstreamSupplier,
  UpstreamSupplierAuthMethod,
  UpstreamSupplierAuthMethodInput,
  UpstreamSupplierEndpoint,
  UpstreamSupplierEndpointInput,
  UpstreamSupplierListResponse,
  UpstreamSupplierModelListEntry,
  UpdatePaymentProviderRequest,
  VerifyUpstreamAccountRequest,
} from '@sdkwork/cloudrouter-backend-sdk';
export type {
  CheckAttemptStatusCommand,
  CheckAttemptStatusResult,
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
  UpdatePaymentChannelCommand,
  UpdatePaymentMethodCommand,
  UpdateRouteRuleCommand,
} from '@sdkwork/payment-backend-sdk';
export type {
  AdminAiResourceCreateRequest,
  AdminAiResourceMemberInput,
  AdminAiResourceUpdateRequest,
  AdminModelMappingCreateRequest,
  AdminModelMappingRuleBindingInput,
  AdminModelMappingRuleItemInput,
  AdminModelMappingUpdateRequest,
  AiModelMappingsListParams,
} from '@sdkwork/models-backend-sdk';

export type MediaResource = CloudRouterMediaResource;

export type AdminAuthWechatOfficial = Record<string, unknown> & {
  key: string;
  appId: string;
  name: string;
  originalId?: string;
  secretRef: string;
  tokenRef: string;
  aesKeyRef?: string;
  url?: string;
  enabled: boolean;
  primary: boolean;
  scene?: string;
};

export type AdminAuthWechatMini = Record<string, unknown> & {
  key: string;
  appId: string;
  name: string;
  secretRef: string;
  url?: string;
  path: string;
  env: 'release' | 'trial' | 'develop';
  enabled: boolean;
  primary: boolean;
};

export type AdminAuthVerificationPolicy = Record<string, unknown> & {
  emailCodeLoginEnabled: boolean;
  emailRegistrationVerificationRequired: boolean;
  phoneCodeLoginEnabled: boolean;
  phoneRegistrationVerificationRequired: boolean;
};

export type AdminAuthSettingsUpdateRequest = Omit<
  GeneratedAdminAuthSettingsUpdateRequest,
  'verificationPolicy' | 'wechat'
> & {
  verificationPolicy?: AdminAuthVerificationPolicy;
  wechat?: Record<string, unknown> & {
    mini: AdminAuthWechatMini[];
    official: AdminAuthWechatOfficial[];
  };
};

export {
  getClawRouterBackendSdkClient,
  getModelsBackendSdkClient,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import type { ClawRouterMediaResource } from '@sdkwork/clawroutes-pc-commons/runtime';
import type {
  AdminAuthSettingsUpdateRequest as GeneratedAdminAuthSettingsUpdateRequest,
} from '@sdkwork/clawrouter-backend-sdk';
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
  CreateUpstreamAccountCredentialRequest,
  CreateUpstreamAccountGroupRequest,
  CreateUpstreamAccountRequest,
  CreateUpstreamSupplierRequest,
  ExplainUpstreamAccountGroupRouteRequest,
  ReplaceUpstreamAccountGroupMembersRequest,
  ReplaceUpstreamAccountGroupResourcesRequest,
  ReplaceUpstreamSupplierAuthMethodsRequest,
  ReplaceUpstreamSupplierEndpointsRequest,
  ReplaceUpstreamSupplierResourcesRequest,
  UpdateUpstreamAccountGroupRequest,
  UpdateUpstreamAccountRequest,
  UpdateUpstreamSupplierRequest,
  UpstreamAccount,
  UpstreamAccountCredential,
  UpstreamAccountCredentialCreated,
  UpstreamAccountGroup,
  UpstreamAccountGroupMember,
  UpstreamAccountGroupMemberInput,
  UpstreamAccountGroupRouteExplanation,
  UpstreamAccountVerification,
  UpstreamResourceEntitlement,
  UpstreamResourceEntitlementInput,
  UpstreamSupplier,
  UpstreamSupplierAuthMethod,
  UpstreamSupplierAuthMethodInput,
  UpstreamSupplierEndpoint,
  UpstreamSupplierEndpointInput,
} from '@sdkwork/clawrouter-backend-sdk';
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

export type MediaResource = ClawRouterMediaResource;

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

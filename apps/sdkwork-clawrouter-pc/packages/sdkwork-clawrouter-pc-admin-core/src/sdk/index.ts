export {
  getClawRouterBackendSdkClient,
  getModelsBackendSdkClient,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import type { ClawRouterMediaResource } from '@sdkwork/clawroutes-pc-commons/runtime';
import type {
  AdminAuthSettingsUpdateRequest as GeneratedAdminAuthSettingsUpdateRequest,
  AdminChannelCreateRequest as GeneratedAdminChannelCreateRequest,
  AdminChannelGroupCreateRequest as GeneratedAdminChannelGroupCreateRequest,
  AdminChannelGroupUpdateRequest as GeneratedAdminChannelGroupUpdateRequest,
  AdminChannelUpdateRequest as GeneratedAdminChannelUpdateRequest,
} from '@sdkwork/clawrouter-backend-sdk';
export type {
  AdminFirewallRuleCreateRequest,
  AdminIpLimitCreateRequest,
  AdminModelLimitCreateRequest,
  AdminProviderSecretCreateRequest,
  AdminProviderSecretUpdateRequest,
  AdminRuntimeRegionSettingsResponse,
  AdminRuntimeRegionSettingsUpdateRequest,
  AdminRuntimeRouteExplainRequest,
  AdminServiceNodeCreateRequest,
  AdminServiceNodeUpdateRequest,
  AdminSiteCreateRequest,
  AdminSiteSettingsResponse,
  AdminSiteSettingsUpdateRequest,
  AdminSiteUpdateRequest,
  AdminTokenLimitCreateRequest,
  IntegrationProviderSecretsListParams,
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

export type ProviderRetryPolicy = Record<string, unknown> & {
  maxAttempts: number;
  retryableStatusCodes: Array<408 | 409 | 425 | 429 | 500 | 502 | 503 | 504>;
  backoffMs?: number;
};

export type ProviderCircuitBreakerPolicy = Record<string, unknown> & {
  failureThreshold: number;
};

export type AdminChannelCredentialInput = Record<string, unknown> & {
  name?: string;
  baseUrl: string;
  apiKey?: string;
  secretRef?: string;
  priority?: string;
  weight?: string;
  status?: 'active' | 'disabled' | 'error';
};

type AdminChannelNestedRequestFields = {
  credentials?: AdminChannelCredentialInput[];
  retryPolicy?: ProviderRetryPolicy | null;
  circuitBreakerPolicy?: ProviderCircuitBreakerPolicy | null;
};

export type AdminChannelCreateRequest = Omit<
  GeneratedAdminChannelCreateRequest,
  keyof AdminChannelNestedRequestFields
> & Required<Pick<AdminChannelNestedRequestFields, 'credentials'>> & Omit<
  AdminChannelNestedRequestFields,
  'credentials'
>;

export type AdminChannelUpdateRequest = Omit<
  GeneratedAdminChannelUpdateRequest,
  keyof AdminChannelNestedRequestFields | 'expiresAt'
> & AdminChannelNestedRequestFields & {
  expiresAt?: string | null;
};

type AdminChannelGroupRequestFields = {
  capacity?: Record<string, unknown> & { total: number };
};

export type AdminChannelGroupCreateRequest = Omit<
  GeneratedAdminChannelGroupCreateRequest,
  'capacity'
> & Required<AdminChannelGroupRequestFields>;

export type AdminChannelGroupUpdateRequest = Omit<
  GeneratedAdminChannelGroupUpdateRequest,
  'capacity'
> & AdminChannelGroupRequestFields;

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

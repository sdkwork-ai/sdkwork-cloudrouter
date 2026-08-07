import {
  omitAuthProjectionBody,
  omitAuthProjectionQuery,
} from './auth-projection.ts';
import { createTokenManager, type AuthTokenManager, type AuthTokens } from '@sdkwork/sdk-common';
import { SdkworkAppClient, type SdkworkAppConfig } from '@sdkwork/cloudrouter-app-sdk';
import { SdkworkBackendClient, type SdkworkBackendConfig } from '@sdkwork/cloudrouter-backend-sdk';
import { SdkworkDriveBackendClient as DriveBackendClient } from '@sdkwork/cloudrouter-pc-core/sdk';
import { SdkworkBackendClient as ModelsBackendClient } from '@sdkwork/models-backend-sdk';
import { SdkworkAppClient as ModelsAppClient } from '@sdkwork/models-app-sdk';
import { SdkworkBackendClient as MembershipBackendClient } from '@sdkwork/membership-backend-sdk';
import { SdkworkBackendClient as PaymentBackendClient } from '@sdkwork/payment-backend-sdk';
import { SdkworkBackendClient as BaseDataBackendClient } from '@sdkwork/base-data-backend-sdk';
import { SdkworkBackendClient as PromotionBackendClient } from '@sdkwork/promotion-backend-sdk';
import { SdkworkBackendClient as PartnerBackendClient } from '@sdkwork/partner-backend-sdk';
import { SdkworkAiClient, type SdkworkAiConfig } from '@sdkwork/cloudrouter-open-sdk';
import {
  SdkworkGenerationsAppSdkClient as SdkworkGenerationsAppClient,
  type SdkworkGenerationsAppSdkConfig as SdkworkGenerationsAppConfig,
} from '@sdkwork/cloudrouter-pc-core/sdk';
import {
  SdkworkAppClient as SdkworkMemoryAppClient,
  type SdkworkAppConfig as SdkworkMemoryAppConfig,
} from '@sdkwork/memory-app-sdk';
import {
  createClient as createCommunityAppSdkClient,
  type SdkworkAppConfig as SdkworkCommunityAppConfig,
  type SdkworkCommunityAppClient,
} from '@sdkwork/community-app-sdk';
import {
  createClient as createPromptsAppSdkClient,
  type SdkworkAppConfig as SdkworkPromptsAppConfig,
  type SdkworkPromptsAppClient as PromptsAppClient,
} from '@sdkwork/prompts-app-sdk';
import {
  SdkworkAppClient as SdkworkAgentAppClient,
  type SdkworkAppConfig as SdkworkAgentAppConfig,
} from '@sdkwork/agents-app-sdk';
import {
  SdkworkBackendClient as SdkworkAgentBackendClient,
  type SdkworkBackendConfig as SdkworkAgentBackendConfig,
} from '@sdkwork/agents-backend-sdk';
import {
  SdkworkPromptsBackendClient,
  createClient as createPromptsBackendSdkClient,
  type SdkworkBackendConfig as SdkworkPromptsBackendConfig,
} from '@sdkwork/prompts-backend-sdk';
import {
  SdkworkAppClient as SdkworkAppbaseAppClient,
  type SdkworkAppConfig as SdkworkAppbaseAppConfig,
} from '@sdkwork/iam-app-sdk';
import {
  SdkworkBackendClient as SdkworkAppbaseBackendClient,
  type SdkworkBackendConfig as SdkworkAppbaseBackendConfig,
} from '@sdkwork/iam-backend-sdk';
import {
  SdkworkAppClient as MessagingAppClient,
  type SdkworkAppConfig as MessagingAppConfig,
} from '@sdkwork/messaging-app-sdk';
import {
  createDriveAppClient,
  type SdkworkAppConfig as SdkworkDriveAppConfig,
  type SdkworkDriveAppClient,
} from '@sdkwork/drive-app-sdk';
import {
  SdkworkAccountAppSdkClient as AccountAppClient,
  type SdkworkAccountAppSdkConfig as AccountAppConfig,
  SdkworkCatalogAppSdkClient as CatalogAppClient,
  type SdkworkCatalogAppSdkConfig as CatalogAppConfig,
  SdkworkMembershipAppSdkClient as MembershipAppClient,
  type SdkworkMembershipAppSdkConfig as MembershipAppConfig,
  SdkworkOrderAppSdkClient as OrderAppClient,
  type SdkworkOrderAppSdkConfig as OrderAppConfig,
  SdkworkPaymentAppSdkClient as PaymentAppClient,
  type SdkworkPaymentAppSdkConfig as PaymentAppConfig,
  SdkworkPromotionAppSdkClient as PromotionAppClient,
  type SdkworkPromotionAppSdkConfig as PromotionAppConfig,
} from '@sdkwork/cloudrouter-pc-core/sdk';
import {
  clearStoredAppSessionToken,
  loadStoredAppSessionToken,
  subscribeStoredAppSessionChange,
} from './app-session-token.ts';
import { resetCloudRouterIamRuntime } from './iam-runtime.ts';
import { buildPortalAuthLoginRedirect, isProtectedPortalPath } from './portal-auth.ts';
import { normalizeGeneratedSdkBaseUrl } from './sdk-base-url.ts';

export { normalizeGeneratedSdkBaseUrl } from './sdk-base-url.ts';
import {
  attachSdkworkSdkSessionAuthBoundary,
  type SdkworkSdkClientWithHttp,
} from '@sdkwork/auth-runtime-pc-react/attachSdkworkSdkSessionAuthBoundary';
import {
  handleSdkworkSessionAuthUnauthorizedError,
  resetSdkworkSessionAuthRedirectState,
} from '@sdkwork/auth-runtime-pc-react/handleSdkworkSessionAuthUnauthorizedError';
import { isSdkworkSdkSessionAuthError } from '@sdkwork/auth-runtime-pc-react/sdkSessionAuthError';
import { readCloudRouterRuntimeEnv } from './utils/env.ts';
import {
  prepareCredentialEntryTokens,
  readBootstrapAccessTokenFromProcessEnv,
  SDKWORK_ACCESS_TOKEN_ENV_KEY,
} from '@sdkwork/iam-credential-entry';

export const APP_API_PREFIX = '/app/v3/api';
export const BACKEND_API_PREFIX = '/backend/v3/api';
export { SDKWORK_ACCESS_TOKEN_ENV_KEY };
export const OPEN_API_PREFIX = '/v1';
export const DRIVE_OPEN_API_PREFIX = '/open/v3/api';
export const MEMORY_OPEN_API_PREFIX = '/mem/v3/api';
export const AGENT_OPEN_API_PREFIX = '/agent/v3/api';
export const CLOUD_API_PREFIX = '/cloud/v3';
export const PAYMENT_API_PREFIX = '/payments/v3';
export const PAAS_API_PREFIX = '/paas/v3';

export function requiresClientContextSelectorSanitization(path: string): boolean {
  const normalized = path.split('?')[0]?.toLowerCase() ?? '';
  if (normalized.includes(BACKEND_API_PREFIX)) {
    return false;
  }
  return (
    normalized.includes(APP_API_PREFIX)
    || normalized.startsWith(OPEN_API_PREFIX)
    || normalized.includes(DRIVE_OPEN_API_PREFIX)
    || normalized.includes(MEMORY_OPEN_API_PREFIX)
    || normalized.includes(AGENT_OPEN_API_PREFIX)
  );
}

export function sanitizeSdkHttpRequestOptions(path: string, options: unknown): unknown {
  if (!requiresClientContextSelectorSanitization(path) || typeof options !== 'object' || options === null) {
    return options;
  }

  const requestOptions = options as Record<string, unknown>;
  const next: Record<string, unknown> = { ...requestOptions };

  if ('params' in requestOptions) {
    const params = omitAuthProjectionQuery(
      requestOptions.params as Record<string, string | number | boolean | undefined> | undefined,
    );
    if (params) {
      next.params = params;
    } else {
      delete next.params;
    }
  }

  if ('body' in requestOptions) {
    next.body = omitAuthProjectionBody(requestOptions.body);
  }

  return next;
}

export type CloudRouterGeneratedSdkType =
  | 'app'
  | 'backend'
  | 'ai'
  | 'drive'
  | 'memory'
  | 'agent'
  | 'payment'
  | 'iaas'
  | 'paas';

export interface CloudRouterGeneratedSdkMetadata {
  name: string;
  packageName: string;
  version: string;
  sdkType: CloudRouterGeneratedSdkType;
  apiPrefix: string;
  runtimeEnvName: string;
  sourceDir: string;
  archiveLanguage: 'typescript';
  archiveName: string;
  description: string;
}

export const CLOUDROUTER_APP_SDK_REFERENCE_METADATA: CloudRouterGeneratedSdkMetadata = {
  name: 'SdkworkAppClient',
  packageName: '@sdkwork/cloudrouter-app-sdk',
  version: '0.1.0',
  sdkType: 'app',
  apiPrefix: APP_API_PREFIX,
  runtimeEnvName: 'VITE_CLOUDROUTER_APP_API_BASE_URL',
  sourceDir: 'sdks/cloudrouter-app-sdk/cloudrouter-app-sdk-typescript/src/index.ts',
  archiveLanguage: 'typescript',
  archiveName: 'sdkwork-cloudrouter-app-sdk-typescript-0.1.0.zip',
  description: 'SDKWork Cloud Router app API SDK',
};

export const CLOUDROUTER_BACKEND_SDK_REFERENCE_METADATA: CloudRouterGeneratedSdkMetadata = {
  name: 'SdkworkBackendClient',
  packageName: '@sdkwork/cloudrouter-backend-sdk',
  version: '0.1.0',
  sdkType: 'backend',
  apiPrefix: BACKEND_API_PREFIX,
  runtimeEnvName: 'VITE_CLOUDROUTER_BACKEND_API_BASE_URL',
  sourceDir: 'sdks/cloudrouter-backend-sdk/cloudrouter-backend-sdk-typescript/src/index.ts',
  archiveLanguage: 'typescript',
  archiveName: 'sdkwork-cloudrouter-backend-sdk-typescript-0.1.0.zip',
  description: 'SDKWork Cloud Router backend API SDK',
};

export const MODELS_APP_SDK_REFERENCE_METADATA: CloudRouterGeneratedSdkMetadata = {
  name: 'SdkworkAppClient',
  packageName: '@sdkwork/models-app-sdk',
  version: '0.1.0',
  sdkType: 'app',
  apiPrefix: APP_API_PREFIX,
  runtimeEnvName: 'VITE_SDKWORK_MODELS_APP_API_BASE_URL',
  sourceDir: 'sdks/sdkwork-models-app-sdk/sdkwork-models-app-sdk-typescript/src/index.ts',
  archiveLanguage: 'typescript',
  archiveName: 'sdkwork-models-app-sdk-typescript-0.1.0.zip',
  description: 'SDKWork Models app catalog API SDK',
};

export const CLOUDROUTER_AI_SDK_REFERENCE_METADATA: CloudRouterGeneratedSdkMetadata = {
  name: 'SdkworkAiClient',
  packageName: '@sdkwork/cloudrouter-open-sdk',
  version: '0.1.0',
  sdkType: 'ai',
  apiPrefix: OPEN_API_PREFIX,
  runtimeEnvName: 'VITE_CLOUDROUTER_OPEN_API_BASE_URL',
  sourceDir: 'sdks/cloudrouter-open-sdk/cloudrouter-open-sdk-typescript/src/index.ts',
  archiveLanguage: 'typescript',
  archiveName: 'sdkwork-cloudrouter-open-sdk-typescript-0.1.0.zip',
  description: 'SDKWork OpenAI-compatible AI API SDK',
};

export const CLOUDROUTER_LLM_OPEN_API_SDK_REFERENCE_METADATA: CloudRouterGeneratedSdkMetadata = {
  ...CLOUDROUTER_AI_SDK_REFERENCE_METADATA,
  description: 'SDKWork LLM Open API SDK',
};

export const CLOUDROUTER_IMAGE_OPEN_API_SDK_REFERENCE_METADATA: CloudRouterGeneratedSdkMetadata = {
  ...CLOUDROUTER_AI_SDK_REFERENCE_METADATA,
  description: 'SDKWork Image Open API SDK',
};

export const CLOUDROUTER_VIDEO_OPEN_API_SDK_REFERENCE_METADATA: CloudRouterGeneratedSdkMetadata = {
  ...CLOUDROUTER_AI_SDK_REFERENCE_METADATA,
  description: 'SDKWork Video Open API SDK',
};

export const CLOUDROUTER_AUDIO_OPEN_API_SDK_REFERENCE_METADATA: CloudRouterGeneratedSdkMetadata = {
  ...CLOUDROUTER_AI_SDK_REFERENCE_METADATA,
  description: 'SDKWork Audio Open API SDK',
};

export const CLOUDROUTER_DRIVE_OPEN_API_SDK_REFERENCE_METADATA: CloudRouterGeneratedSdkMetadata = {
  name: 'SdkworkDriveOpenClient',
  packageName: '@sdkwork-internal/drive-sdk-generated',
  version: '0.1.0',
  sdkType: 'drive',
  apiPrefix: DRIVE_OPEN_API_PREFIX,
  runtimeEnvName: 'VITE_SDKWORK_DRIVE_OPEN_API_BASE_URL',
  sourceDir: '../sdkwork-drive/sdks/sdkwork-drive-sdk/sdkwork-drive-sdk-typescript/src/index.ts',
  archiveLanguage: 'typescript',
  archiveName: 'sdkwork-drive-sdk-typescript-0.1.0.zip',
  description: 'SDKWork Drive Open API SDK',
};

export const CLOUDROUTER_KNOWLEDGEBASE_OPEN_API_SDK_REFERENCE_METADATA: CloudRouterGeneratedSdkMetadata = {
  ...CLOUDROUTER_AI_SDK_REFERENCE_METADATA,
  description: 'SDKWork Knowledgebase Open API SDK',
};

export const CLOUDROUTER_MEMORY_OPEN_API_SDK_REFERENCE_METADATA: CloudRouterGeneratedSdkMetadata = {
  name: 'SdkworkMemoryOpenClient',
  packageName: '@sdkwork/memory-sdk',
  version: '0.1.0',
  sdkType: 'memory',
  apiPrefix: MEMORY_OPEN_API_PREFIX,
  runtimeEnvName: 'VITE_SDKWORK_MEMORY_OPEN_API_BASE_URL',
  sourceDir: '../sdkwork-memory/sdks/sdkwork-memory-sdk/openapi/memory-open-api.openapi.json',
  archiveLanguage: 'typescript',
  archiveName: 'sdkwork-memory-sdk-typescript-0.1.0.zip',
  description: 'SDKWork Memory Open API SDK',
};

export const CLOUDROUTER_AGENT_OPEN_API_SDK_REFERENCE_METADATA: CloudRouterGeneratedSdkMetadata = {
  name: 'SdkworkAgentClient',
  packageName: '@sdkwork/agent-sdk',
  version: '0.1.0',
  sdkType: 'agent',
  apiPrefix: AGENT_OPEN_API_PREFIX,
  runtimeEnvName: 'VITE_SDKWORK_AGENT_OPEN_API_BASE_URL',
  sourceDir: '../sdkwork-kernel/sdks/sdkwork-agent-sdk/sdkwork-agent-sdk-typescript/src/index.ts',
  archiveLanguage: 'typescript',
  archiveName: 'sdkwork-agent-sdk-typescript-0.1.0.zip',
  description: 'SDKWork Agent Open API SDK',
};

export const CLOUDROUTER_PAYMENT_OPEN_API_SDK_REFERENCE_METADATA: CloudRouterGeneratedSdkMetadata = {
  name: 'SdkworkPaymentClient',
  packageName: '@sdkwork/cloudrouter-payment-sdk',
  version: '0.1.0',
  sdkType: 'payment',
  apiPrefix: PAYMENT_API_PREFIX,
  runtimeEnvName: 'VITE_CLOUDROUTER_PAYMENT_API_BASE_URL',
  sourceDir: 'crates/sdkwork-cloudrouter-http/specs/payment-aggregate-openapi.json',
  archiveLanguage: 'typescript',
  archiveName: 'sdkwork-cloudrouter-payment-sdk-typescript-0.1.0.zip',
  description: 'SDKWork Payment Open API SDK',
};

export const CLOUDROUTER_IAAS_OPEN_API_SDK_REFERENCE_METADATA: CloudRouterGeneratedSdkMetadata = {
  name: 'SdkworkCloudServicesClient',
  packageName: '@sdkwork/cloudrouter-cloud-services-sdk',
  version: '0.1.0',
  sdkType: 'iaas',
  apiPrefix: CLOUD_API_PREFIX,
  runtimeEnvName: 'VITE_CLOUDROUTER_CLOUD_API_BASE_URL',
  sourceDir: 'crates/sdkwork-cloudrouter-http/specs/cloud-services-openapi.json',
  archiveLanguage: 'typescript',
  archiveName: 'sdkwork-cloudrouter-cloud-services-sdk-typescript-0.1.0.zip',
  description: 'SDKWork IaaS Open API SDK',
};

export const CLOUDROUTER_CLOUD_SERVICES_SDK_REFERENCE_METADATA: CloudRouterGeneratedSdkMetadata = {
  ...CLOUDROUTER_IAAS_OPEN_API_SDK_REFERENCE_METADATA,
  description: 'SDKWork S3-compatible cloud services API SDK',
};

export const CLOUDROUTER_PAAS_OPEN_API_SDK_REFERENCE_METADATA: CloudRouterGeneratedSdkMetadata = {
  name: 'SdkworkPaasClient',
  packageName: '@sdkwork/cloudrouter-paas-sdk',
  version: '0.1.0',
  sdkType: 'paas',
  apiPrefix: PAAS_API_PREFIX,
  runtimeEnvName: 'VITE_CLOUDROUTER_PAAS_API_BASE_URL',
  sourceDir: 'crates/sdkwork-cloudrouter-http/specs/paas-openapi.json',
  archiveLanguage: 'typescript',
  archiveName: 'sdkwork-cloudrouter-paas-sdk-typescript-0.1.0.zip',
  description: 'SDKWork PaaS Open API SDK',
};

export const SDK_SYSTEM_CONFIG = {
  'llm-open-api': CLOUDROUTER_LLM_OPEN_API_SDK_REFERENCE_METADATA,
  'image-open-api': CLOUDROUTER_IMAGE_OPEN_API_SDK_REFERENCE_METADATA,
  'video-open-api': CLOUDROUTER_VIDEO_OPEN_API_SDK_REFERENCE_METADATA,
  'audio-open-api': CLOUDROUTER_AUDIO_OPEN_API_SDK_REFERENCE_METADATA,
  'drive-open-api': CLOUDROUTER_DRIVE_OPEN_API_SDK_REFERENCE_METADATA,
  'knowledgebase-open-api': CLOUDROUTER_KNOWLEDGEBASE_OPEN_API_SDK_REFERENCE_METADATA,
  'memory-open-api': CLOUDROUTER_MEMORY_OPEN_API_SDK_REFERENCE_METADATA,
  'agent-open-api': CLOUDROUTER_AGENT_OPEN_API_SDK_REFERENCE_METADATA,
  'sdkwork-drive-open-api': CLOUDROUTER_DRIVE_OPEN_API_SDK_REFERENCE_METADATA,
  'sdkwork-drive.open': CLOUDROUTER_DRIVE_OPEN_API_SDK_REFERENCE_METADATA,
  'sdkwork-knowledgebase-open-api': CLOUDROUTER_KNOWLEDGEBASE_OPEN_API_SDK_REFERENCE_METADATA,
  'sdkwork-memory-open-api': CLOUDROUTER_MEMORY_OPEN_API_SDK_REFERENCE_METADATA,
  'sdkwork-agent-open-api': CLOUDROUTER_AGENT_OPEN_API_SDK_REFERENCE_METADATA,
  'payment-open-api': CLOUDROUTER_PAYMENT_OPEN_API_SDK_REFERENCE_METADATA,
  'iaas-open-api': CLOUDROUTER_IAAS_OPEN_API_SDK_REFERENCE_METADATA,
  'paas-open-api': CLOUDROUTER_PAAS_OPEN_API_SDK_REFERENCE_METADATA,
  'app-api': CLOUDROUTER_APP_SDK_REFERENCE_METADATA,
  'backend-api': CLOUDROUTER_BACKEND_SDK_REFERENCE_METADATA,
  gateway: CLOUDROUTER_LLM_OPEN_API_SDK_REFERENCE_METADATA,
  'cloud-services': CLOUDROUTER_IAAS_OPEN_API_SDK_REFERENCE_METADATA,
  'paas-api': CLOUDROUTER_PAAS_OPEN_API_SDK_REFERENCE_METADATA,
  'payment-aggregate': CLOUDROUTER_PAYMENT_OPEN_API_SDK_REFERENCE_METADATA,
  'voice-open-api': CLOUDROUTER_AUDIO_OPEN_API_SDK_REFERENCE_METADATA,
  app: CLOUDROUTER_APP_SDK_REFERENCE_METADATA,
  backend: CLOUDROUTER_BACKEND_SDK_REFERENCE_METADATA,
} as const satisfies Record<string, CloudRouterGeneratedSdkMetadata>;

export interface CloudRouterAppSdkClientOptions {
  appBaseUrl?: string;
  platform?: string;
  tokenManager?: AuthTokenManager;
  timeout?: number;
}

export interface CloudRouterBackendSdkClientOptions {
  backendBaseUrl?: string;
  platform?: string;
  tokenManager?: AuthTokenManager;
  timeout?: number;
}

export interface SdkworkAppbaseAppSdkClientOptions {
  appBaseUrl?: string;
  platform?: string;
  tokenManager?: AuthTokenManager;
  timeout?: number;
}

export interface SdkworkGenerationsAppSdkClientOptions {
  appBaseUrl?: string;
  platform?: string;
  tokenManager?: AuthTokenManager;
  timeout?: number;
}

export interface SdkworkMemoryAppSdkClientOptions {
  appBaseUrl?: string;
  platform?: string;
  tokenManager?: AuthTokenManager;
  timeout?: number;
}

export interface SdkworkCommunityAppSdkClientOptions {
  appBaseUrl?: string;
  platform?: string;
  tokenManager?: AuthTokenManager;
  timeout?: number;
}

export interface SdkworkPromptsAppSdkClientOptions {
  appBaseUrl?: string;
  platform?: string;
  tokenManager?: AuthTokenManager;
  timeout?: number;
}

export interface SdkworkAgentAppSdkClientOptions {
  appBaseUrl?: string;
  platform?: string;
  tokenManager?: AuthTokenManager;
  timeout?: number;
}

export interface SdkworkAgentBackendSdkClientOptions {
  backendBaseUrl?: string;
  platform?: string;
  tokenManager?: AuthTokenManager;
  timeout?: number;
}

export interface SdkworkPromptsBackendSdkClientOptions {
  backendBaseUrl?: string;
  platform?: string;
  tokenManager?: AuthTokenManager;
  timeout?: number;
}

export interface SdkworkDriveAppSdkClientOptions {
  appBaseUrl?: string;
  platform?: string;
  tokenManager?: AuthTokenManager;
  timeout?: number;
}

export interface SdkworkAppbaseBackendSdkClientOptions {
  backendBaseUrl?: string;
  platform?: string;
  tokenManager?: AuthTokenManager;
  timeout?: number;
}

export interface CloudRouterAiSdkClientOptions {
  aiBaseUrl?: string;
  apiKey?: string;
  platform?: string;
  timeout?: number;
}

export type CloudRouterAppSdkClient = SdkworkAppClient;
export type CloudRouterBackendSdkClient = SdkworkBackendClient;
export type SdkworkAppbaseAppSdkClient = SdkworkAppbaseAppClient;
export type SdkworkAppbaseBackendSdkClient = SdkworkAppbaseBackendClient;
export type SdkworkMessagingAppSdkClient = MessagingAppClient;
export type SdkworkGenerationsAppSdkClient = SdkworkGenerationsAppClient;
export type SdkworkMemoryAppSdkClient = SdkworkMemoryAppClient;
export type SdkworkCommunityAppSdkClient = SdkworkCommunityAppClient;
export type SdkworkPromptsAppSdkClient = PromptsAppClient;
export type SdkworkAgentAppSdkClient = SdkworkAgentAppClient;
export type SdkworkAgentBackendSdkClient = SdkworkAgentBackendClient;
export type SdkworkPromptsBackendSdkClient = SdkworkPromptsBackendClient;
export type SdkworkDriveAppSdkClient = SdkworkDriveAppClient;
export type SdkworkMembershipBackendSdkClient = MembershipBackendClient;
export type SdkworkPaymentBackendSdkClient = PaymentBackendClient;
export type SdkworkBaseDataBackendSdkClient = BaseDataBackendClient;
export type SdkworkPromotionBackendSdkClient = PromotionBackendClient;
export type {
  CouponStock as SdkworkPromotionCouponStock,
  CouponStockRequest as SdkworkPromotionCouponStockRequest,
  PromotionCampaign as SdkworkPromotionCampaign,
  PromotionCampaignRequest as SdkworkPromotionCampaignRequest,
  PromotionCodeBatch as SdkworkPromotionCodeBatch,
  PromotionCodeBatchRequest as SdkworkPromotionCodeBatchRequest,
  PromotionCouponBenefitRequest as SdkworkPromotionCouponBenefitRequest,
  PromotionDistributionRequest as SdkworkPromotionDistributionRequest,
  PromotionDistributionTask as SdkworkPromotionDistributionTask,
  PromotionOffer as SdkworkPromotionOffer,
  PromotionOfferRequest as SdkworkPromotionOfferRequest,
} from '@sdkwork/promotion-backend-sdk';
export type SdkworkAccountAppSdkClient = AccountAppClient;
export type SdkworkCatalogAppSdkClient = CatalogAppClient;
export type SdkworkMembershipAppSdkClient = MembershipAppClient;
export type SdkworkOrderAppSdkClient = OrderAppClient;
export type SdkworkPaymentAppSdkClient = PaymentAppClient;
export type SdkworkPromotionAppSdkClient = PromotionAppClient;
export type SdkworkAccountAppSdkClientOptions = CloudRouterAppSdkClientOptions;
export type SdkworkCatalogAppSdkClientOptions = CloudRouterAppSdkClientOptions;
export type SdkworkMembershipAppSdkClientOptions = CloudRouterAppSdkClientOptions;
export type SdkworkOrderAppSdkClientOptions = CloudRouterAppSdkClientOptions;
export type SdkworkPaymentAppSdkClientOptions = CloudRouterAppSdkClientOptions;
export type SdkworkPromotionAppSdkClientOptions = CloudRouterAppSdkClientOptions;
export type SdkworkMessagingAppSdkClientOptions = CloudRouterAppSdkClientOptions;
export type SdkworkMembershipBackendSdkClientOptions = CloudRouterBackendSdkClientOptions;
export type SdkworkPaymentBackendSdkClientOptions = CloudRouterBackendSdkClientOptions;
export type SdkworkBaseDataBackendSdkClientOptions = CloudRouterBackendSdkClientOptions;
export type SdkworkPromotionBackendSdkClientOptions = CloudRouterBackendSdkClientOptions;
export type SdkworkPartnerBackendSdkClientOptions = CloudRouterBackendSdkClientOptions;
export type CloudRouterAiSdkClient = SdkworkAiClient;

type CloudRouterSdkRuntimeHost = typeof globalThis & {
  __SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__?: CloudRouterAppSdkClient | null;
  __SDKWORK_CLOUDROUTER_ROUTER_BACKEND_SDK_CLIENT__?: CloudRouterBackendSdkClient | null;
  __SDKWORK_APPBASE_APP_SDK_CLIENT__?: SdkworkAppbaseAppSdkClient | null;
  __SDKWORK_APPBASE_BACKEND_SDK_CLIENT__?: SdkworkAppbaseBackendSdkClient | null;
  __SDKWORK_MESSAGING_APP_SDK_CLIENT__?: SdkworkMessagingAppSdkClient | null;
  __SDKWORK_GENERATIONS_APP_SDK_CLIENT__?: SdkworkGenerationsAppSdkClient | null;
  __SDKWORK_MEMORY_APP_SDK_CLIENT__?: SdkworkMemoryAppSdkClient | null;
  __SDKWORK_COMMUNITY_APP_SDK_CLIENT__?: SdkworkCommunityAppSdkClient | null;
  __SDKWORK_AGENT_APP_SDK_CLIENT__?: SdkworkAgentAppSdkClient | null;
  __SDKWORK_AGENT_BACKEND_SDK_CLIENT__?: SdkworkAgentBackendSdkClient | null;
  __SDKWORK_DRIVE_APP_SDK_CLIENT__?: SdkworkDriveAppSdkClient | null;
  __SDKWORK_ACCOUNT_APP_SDK_CLIENT__?: SdkworkAccountAppSdkClient | null;
  __SDKWORK_CATALOG_APP_SDK_CLIENT__?: SdkworkCatalogAppSdkClient | null;
  __SDKWORK_MEMBERSHIP_APP_SDK_CLIENT__?: SdkworkMembershipAppSdkClient | null;
  __SDKWORK_ORDER_APP_SDK_CLIENT__?: SdkworkOrderAppSdkClient | null;
  __SDKWORK_PAYMENT_APP_SDK_CLIENT__?: SdkworkPaymentAppSdkClient | null;
  __SDKWORK_PROMOTION_APP_SDK_CLIENT__?: SdkworkPromotionAppSdkClient | null;
  __SDKWORK_CLOUDROUTER_ROUTER_AI_SDK_CLIENT__?: CloudRouterAiSdkClient | null;
};

type CloudRouterSdkClientWithHttp = {
  http: unknown;
};

type BrowserLocationWithReplace = {
  hash?: string;
  hostname?: string;
  pathname?: string;
  replace?: (url: string) => void;
  search?: string;
};

type BrowserWindowWithLocation = {
  location?: BrowserLocationWithReplace;
};


let appClient: CloudRouterAppSdkClient | null = null;
let backendClient: CloudRouterBackendSdkClient | null = null;
let appbaseAppClient: SdkworkAppbaseAppClient | null = null;
let appbaseBackendClient: SdkworkAppbaseBackendClient | null = null;
let messagingAppClient: MessagingAppClient | null = null;
let generationsAppClient: SdkworkGenerationsAppClient | null = null;
let memoryAppClient: SdkworkMemoryAppClient | null = null;
let communityAppClient: SdkworkCommunityAppClient | null = null;
let promptsAppClient: PromptsAppClient | null = null;
let agentAppClient: SdkworkAgentAppClient | null = null;
let agentBackendClient: SdkworkAgentBackendClient | null = null;
let promptsBackendClient: SdkworkPromptsBackendClient | null = null;
let driveAppClient: SdkworkDriveAppClient | null = null;
let driveBackendClient: DriveBackendSdkClient | null = null;
let membershipBackendClient: MembershipBackendClient | null = null;
let paymentBackendClient: PaymentBackendClient | null = null;
let baseDataBackendClient: BaseDataBackendClient | null = null;
let promotionBackendClient: PromotionBackendClient | null = null;
let partnerBackendClient: PartnerBackendClient | null = null;
let accountAppClient: AccountAppClient | null = null;
let catalogAppClient: CatalogAppClient | null = null;
let membershipAppClient: MembershipAppClient | null = null;
let orderAppClient: OrderAppClient | null = null;
let paymentAppClient: PaymentAppClient | null = null;
let promotionAppClient: PromotionAppClient | null = null;
let aiClient: SdkworkAiClient | null = null;
let aiClientSessionKey: string | undefined;
let cloudRouterGlobalTokenManager: AuthTokenManager | null = null;
let cloudRouterSessionAuthRedirectTarget: string | null = null;


export function createCloudRouterAppSdkClient(options: CloudRouterAppSdkClientOptions = {}): CloudRouterAppSdkClient {
  return attachCloudRouterSdkSessionAuthBoundary(new SdkworkAppClient(buildAppConfig(options)));
}

export function createCloudRouterBackendSdkClient(options: CloudRouterBackendSdkClientOptions = {}): CloudRouterBackendSdkClient {
  return attachCloudRouterSdkSessionAuthBoundary(new SdkworkBackendClient(buildBackendConfig(options)));
}

export function createSdkworkAppbaseAppSdkClient(
  options: SdkworkAppbaseAppSdkClientOptions = {},
): SdkworkAppbaseAppClient {
  return attachCloudRouterSdkSessionAuthBoundary(new SdkworkAppbaseAppClient(buildAppbaseAppConfig(options)));
}

export function createSdkworkAppbaseBackendSdkClient(
  options: SdkworkAppbaseBackendSdkClientOptions = {},
): SdkworkAppbaseBackendClient {
  return attachCloudRouterSdkSessionAuthBoundary(new SdkworkAppbaseBackendClient(buildAppbaseBackendConfig(options)));
}

export function createSdkworkMessagingAppSdkClient(
  options: SdkworkMessagingAppSdkClientOptions = {},
): MessagingAppClient {
  return attachCloudRouterSdkSessionAuthBoundary(new MessagingAppClient(buildMessagingAppConfig(options)));
}

export function createSdkworkGenerationsAppSdkClient(
  options: SdkworkGenerationsAppSdkClientOptions = {},
): SdkworkGenerationsAppClient {
  return attachCloudRouterSdkSessionAuthBoundary(new SdkworkGenerationsAppClient(buildGenerationsAppConfig(options)));
}

export function createSdkworkMemoryAppSdkClient(
  options: SdkworkMemoryAppSdkClientOptions = {},
): SdkworkMemoryAppClient {
  return attachCloudRouterSdkSessionAuthBoundary(new SdkworkMemoryAppClient(buildMemoryAppConfig(options)));
}

export function createSdkworkCommunityAppSdkClient(
  options: SdkworkCommunityAppSdkClientOptions = {},
): SdkworkCommunityAppClient {
  return attachCloudRouterSdkSessionAuthBoundary(createCommunityAppSdkClient(buildCommunityAppConfig(options)));
}

export function createSdkworkPromptsAppSdkClient(
  options: SdkworkPromptsAppSdkClientOptions = {},
): PromptsAppClient {
  return attachCloudRouterSdkSessionAuthBoundary(createPromptsAppSdkClient(buildPromptsAppConfig(options)));
}

export function createSdkworkAgentAppSdkClient(
  options: SdkworkAgentAppSdkClientOptions = {},
): SdkworkAgentAppClient {
  return attachCloudRouterSdkSessionAuthBoundary(new SdkworkAgentAppClient(buildAgentAppConfig(options)));
}

export function createSdkworkAgentBackendSdkClient(
  options: SdkworkAgentBackendSdkClientOptions = {},
): SdkworkAgentBackendClient {
  return attachCloudRouterSdkSessionAuthBoundary(new SdkworkAgentBackendClient(buildAgentBackendConfig(options)));
}

export function createSdkworkPromptsBackendSdkClient(
  options: SdkworkPromptsBackendSdkClientOptions = {},
): SdkworkPromptsBackendClient {
  return attachCloudRouterSdkSessionAuthBoundary(createPromptsBackendSdkClient(buildPromptsBackendConfig(options)));
}

export function createSdkworkMembershipBackendSdkClient(
  options: SdkworkMembershipBackendSdkClientOptions = {},
): MembershipBackendClient {
  return attachCloudRouterSdkSessionAuthBoundary(
    new MembershipBackendClient(buildDependencyBackendConfig(options, 'VITE_SDKWORK_MEMBERSHIP_BACKEND_API_BASE_URL')),
  );
}

export function createSdkworkPaymentBackendSdkClient(
  options: SdkworkPaymentBackendSdkClientOptions = {},
): PaymentBackendClient {
  return attachCloudRouterSdkSessionAuthBoundary(
    new PaymentBackendClient(buildDependencyBackendConfig(options, 'VITE_SDKWORK_PAYMENT_BACKEND_API_BASE_URL')),
  );
}

export function createSdkworkPromotionBackendSdkClient(
  options: SdkworkPromotionBackendSdkClientOptions = {},
): PromotionBackendClient {
  return attachCloudRouterSdkSessionAuthBoundary(
    new PromotionBackendClient(buildDependencyBackendConfig(options, 'VITE_SDKWORK_PROMOTION_BACKEND_API_BASE_URL')),
  );
}

export function createSdkworkPartnerBackendSdkClient(
  options: SdkworkPartnerBackendSdkClientOptions = {},
): PartnerBackendClient {
  return attachCloudRouterSdkSessionAuthBoundary(
    new PartnerBackendClient(buildDependencyBackendConfig(options, 'VITE_SDKWORK_PARTNER_BACKEND_API_BASE_URL')),
  );
}

export function createSdkworkDriveAppSdkClient(
  options: SdkworkDriveAppSdkClientOptions = {},
): SdkworkDriveAppClient {
  return attachCloudRouterSdkSessionAuthBoundary(createDriveAppClient(buildDriveAppConfig(options)));
}

export function createSdkworkAccountAppSdkClient(
  options: SdkworkAccountAppSdkClientOptions = {},
): AccountAppClient {
  return attachCloudRouterSdkSessionAuthBoundary(new AccountAppClient(buildAccountAppConfig(options)));
}

export function createSdkworkCatalogAppSdkClient(
  options: SdkworkCatalogAppSdkClientOptions = {},
): CatalogAppClient {
  return attachCloudRouterSdkSessionAuthBoundary(new CatalogAppClient(buildCatalogAppConfig(options)));
}

export function createSdkworkMembershipAppSdkClient(
  options: SdkworkMembershipAppSdkClientOptions = {},
): MembershipAppClient {
  return attachCloudRouterSdkSessionAuthBoundary(new MembershipAppClient(buildMembershipAppConfig(options)));
}

export function createSdkworkOrderAppSdkClient(
  options: SdkworkOrderAppSdkClientOptions = {},
): OrderAppClient {
  return attachCloudRouterSdkSessionAuthBoundary(new OrderAppClient(buildOrderAppConfig(options)));
}

export function createSdkworkPaymentAppSdkClient(
  options: SdkworkPaymentAppSdkClientOptions = {},
): PaymentAppClient {
  return attachCloudRouterSdkSessionAuthBoundary(new PaymentAppClient(buildPaymentAppConfig(options)));
}

export function createSdkworkPromotionAppSdkClient(
  options: SdkworkPromotionAppSdkClientOptions = {},
): PromotionAppClient {
  return attachCloudRouterSdkSessionAuthBoundary(new PromotionAppClient(buildPromotionAppConfig(options)));
}

export function createCloudRouterAiSdkClient(options: CloudRouterAiSdkClientOptions = {}): SdkworkAiClient {
  return new SdkworkAiClient(buildAiConfig(options));
}


export function getCloudRouterAppSdkClient(options: CloudRouterAppSdkClientOptions = {}): CloudRouterAppSdkClient {
  if (hasRuntimeOverrides(options)) {
    return createCloudRouterAppSdkClient(options);
  }
  const injected = readInjectedAppSdkClient();
  if (injected) {
    return attachCloudRouterSdkSessionAuthBoundary(injected);
  }
  if (!appClient) {
    appClient = createCloudRouterAppSdkClient();
  }
  return appClient;
}

export function getCloudRouterBackendSdkClient(options: CloudRouterBackendSdkClientOptions = {}): CloudRouterBackendSdkClient {
  if (hasRuntimeOverrides(options)) {
    return createCloudRouterBackendSdkClient(options);
  }
  const injected = readInjectedBackendSdkClient();
  if (injected) {
    return attachCloudRouterSdkSessionAuthBoundary(injected);
  }
  if (!backendClient) {
    backendClient = createCloudRouterBackendSdkClient();
  }
  return backendClient;
}

export type ModelsBackendSdkClient = ModelsBackendClient;
export type ModelsBackendSdkClientOptions = CloudRouterBackendSdkClientOptions;

let modelsBackendClient: ModelsBackendSdkClient | null = null;

export function createModelsBackendSdkClient(
  options: ModelsBackendSdkClientOptions = {},
): ModelsBackendSdkClient {
  return attachCloudRouterSdkSessionAuthBoundary(new ModelsBackendClient(buildModelsBackendConfig(options)));
}

export function getModelsBackendSdkClient(
  options: ModelsBackendSdkClientOptions = {},
): ModelsBackendSdkClient {
  if (hasRuntimeOverrides(options)) {
    return createModelsBackendSdkClient(options);
  }
  if (!modelsBackendClient) {
    modelsBackendClient = createModelsBackendSdkClient();
  }
  return modelsBackendClient;
}

export type ModelsAppSdkClient = ModelsAppClient;
export type ModelsAppSdkClientOptions = CloudRouterAppSdkClientOptions;

let modelsAppClient: ModelsAppSdkClient | null = null;

export function createModelsAppSdkClient(
  options: ModelsAppSdkClientOptions = {},
): ModelsAppSdkClient {
  return attachCloudRouterSdkSessionAuthBoundary(new ModelsAppClient(buildModelsAppConfig(options)));
}

export function getModelsAppSdkClient(
  options: ModelsAppSdkClientOptions = {},
): ModelsAppSdkClient {
  if (hasRuntimeOverrides(options)) {
    return createModelsAppSdkClient(options);
  }
  if (!modelsAppClient) {
    modelsAppClient = createModelsAppSdkClient();
  }
  return modelsAppClient;
}

export function getSdkworkAppbaseAppSdkClient(
  options: SdkworkAppbaseAppSdkClientOptions = {},
): SdkworkAppbaseAppClient {
  if (hasRuntimeOverrides(options)) {
    return createSdkworkAppbaseAppSdkClient(options);
  }
  const injected = readInjectedAppbaseAppSdkClient();
  if (injected) {
    return attachCloudRouterSdkSessionAuthBoundary(injected);
  }
  if (!appbaseAppClient) {
    appbaseAppClient = createSdkworkAppbaseAppSdkClient();
  }
  return appbaseAppClient;
}

export function getSdkworkAppbaseBackendSdkClient(
  options: SdkworkAppbaseBackendSdkClientOptions = {},
): SdkworkAppbaseBackendClient {
  if (hasRuntimeOverrides(options)) {
    return createSdkworkAppbaseBackendSdkClient(options);
  }
  const injected = readInjectedAppbaseBackendSdkClient();
  if (injected) {
    return attachCloudRouterSdkSessionAuthBoundary(injected);
  }
  if (!appbaseBackendClient) {
    appbaseBackendClient = createSdkworkAppbaseBackendSdkClient();
  }
  return appbaseBackendClient;
}

export function getSdkworkMessagingAppSdkClient(
  options: SdkworkMessagingAppSdkClientOptions = {},
): MessagingAppClient {
  if (hasRuntimeOverrides(options)) {
    return createSdkworkMessagingAppSdkClient(options);
  }
  const injected = readInjectedMessagingAppSdkClient();
  if (injected) {
    return attachCloudRouterSdkSessionAuthBoundary(injected);
  }
  if (!messagingAppClient) {
    messagingAppClient = createSdkworkMessagingAppSdkClient();
  }
  return messagingAppClient;
}

export function getSdkworkGenerationsAppSdkClient(
  options: SdkworkGenerationsAppSdkClientOptions = {},
): SdkworkGenerationsAppClient {
  if (hasRuntimeOverrides(options)) {
    return createSdkworkGenerationsAppSdkClient(options);
  }
  const injected = readInjectedGenerationsAppSdkClient();
  if (injected) {
    return attachCloudRouterSdkSessionAuthBoundary(injected);
  }
  if (!generationsAppClient) {
    generationsAppClient = createSdkworkGenerationsAppSdkClient();
  }
  return generationsAppClient;
}

export function getSdkworkMemoryAppSdkClient(
  options: SdkworkMemoryAppSdkClientOptions = {},
): SdkworkMemoryAppSdkClient {
  if (hasRuntimeOverrides(options)) {
    return createSdkworkMemoryAppSdkClient(options);
  }
  const injected = readInjectedMemoryAppSdkClient();
  if (injected) {
    return attachCloudRouterSdkSessionAuthBoundary(injected);
  }
  if (!memoryAppClient) {
    memoryAppClient = createSdkworkMemoryAppSdkClient();
  }
  return memoryAppClient;
}

export function getSdkworkCommunityAppSdkClient(
  options: SdkworkCommunityAppSdkClientOptions = {},
): SdkworkCommunityAppSdkClient {
  if (hasRuntimeOverrides(options)) {
    return createSdkworkCommunityAppSdkClient(options);
  }
  const injected = readInjectedCommunityAppSdkClient();
  if (injected) {
    return attachCloudRouterSdkSessionAuthBoundary(injected);
  }
  if (!communityAppClient) {
    communityAppClient = createSdkworkCommunityAppSdkClient();
  }
  return communityAppClient;
}

export function getSdkworkPromptsAppSdkClient(
  options: SdkworkPromptsAppSdkClientOptions = {},
): SdkworkPromptsAppSdkClient {
  if (hasRuntimeOverrides(options)) {
    return createSdkworkPromptsAppSdkClient(options);
  }
  if (!promptsAppClient) {
    promptsAppClient = createSdkworkPromptsAppSdkClient();
  }
  return promptsAppClient;
}

export function getSdkworkAgentAppSdkClient(
  options: SdkworkAgentAppSdkClientOptions = {},
): SdkworkAgentAppSdkClient {
  if (hasRuntimeOverrides(options)) {
    return createSdkworkAgentAppSdkClient(options);
  }
  const injected = readInjectedAgentAppSdkClient();
  if (injected) {
    return attachCloudRouterSdkSessionAuthBoundary(injected);
  }
  if (!agentAppClient) {
    agentAppClient = createSdkworkAgentAppSdkClient();
  }
  return agentAppClient;
}

export function getSdkworkAgentBackendSdkClient(
  options: SdkworkAgentBackendSdkClientOptions = {},
): SdkworkAgentBackendSdkClient {
  if (hasRuntimeOverrides(options)) {
    return createSdkworkAgentBackendSdkClient(options);
  }
  const injected = readInjectedAgentBackendSdkClient();
  if (injected) {
    return attachCloudRouterSdkSessionAuthBoundary(injected);
  }
  if (!agentBackendClient) {
    agentBackendClient = createSdkworkAgentBackendSdkClient();
  }
  return agentBackendClient;
}

export function getSdkworkPromptsBackendSdkClient(
  options: SdkworkPromptsBackendSdkClientOptions = {},
): SdkworkPromptsBackendSdkClient {
  if (hasRuntimeOverrides(options)) {
    return createSdkworkPromptsBackendSdkClient(options);
  }
  if (!promptsBackendClient) {
    promptsBackendClient = createSdkworkPromptsBackendSdkClient();
  }
  return promptsBackendClient;
}

export function getSdkworkMembershipBackendSdkClient(
  options: SdkworkMembershipBackendSdkClientOptions = {},
): MembershipBackendClient {
  if (hasRuntimeOverrides(options)) {
    return createSdkworkMembershipBackendSdkClient(options);
  }
  if (!membershipBackendClient) {
    membershipBackendClient = createSdkworkMembershipBackendSdkClient();
  }
  return membershipBackendClient;
}

export function getSdkworkPaymentBackendSdkClient(
  options: SdkworkPaymentBackendSdkClientOptions = {},
): PaymentBackendClient {
  if (hasRuntimeOverrides(options)) {
    return createSdkworkPaymentBackendSdkClient(options);
  }
  if (!paymentBackendClient) {
    paymentBackendClient = createSdkworkPaymentBackendSdkClient();
  }
  return paymentBackendClient;
}

export function createSdkworkBaseDataBackendSdkClient(
  options: SdkworkBaseDataBackendSdkClientOptions = {},
): BaseDataBackendClient {
  return attachCloudRouterSdkSessionAuthBoundary(
    new BaseDataBackendClient(buildDependencyBackendConfig(options, 'VITE_SDKWORK_BASE_DATA_BACKEND_API_BASE_URL')),
  );
}

export function getSdkworkBaseDataBackendSdkClient(
  options: SdkworkBaseDataBackendSdkClientOptions = {},
): BaseDataBackendClient {
  if (hasRuntimeOverrides(options)) {
    return createSdkworkBaseDataBackendSdkClient(options);
  }
  if (!baseDataBackendClient) {
    baseDataBackendClient = createSdkworkBaseDataBackendSdkClient();
  }
  return baseDataBackendClient;
}

export function getSdkworkPromotionBackendSdkClient(
  options: SdkworkPromotionBackendSdkClientOptions = {},
): PromotionBackendClient {
  if (hasRuntimeOverrides(options)) {
    return createSdkworkPromotionBackendSdkClient(options);
  }
  if (!promotionBackendClient) {
    promotionBackendClient = createSdkworkPromotionBackendSdkClient();
  }
  return promotionBackendClient;
}

export function getSdkworkPartnerBackendSdkClient(
  options: SdkworkPartnerBackendSdkClientOptions = {},
): PartnerBackendClient {
  if (hasRuntimeOverrides(options)) {
    return createSdkworkPartnerBackendSdkClient(options);
  }
  if (!partnerBackendClient) {
    partnerBackendClient = createSdkworkPartnerBackendSdkClient();
  }
  return partnerBackendClient;
}

export type DriveBackendSdkClient = DriveBackendClient;
export type DriveBackendSdkClientOptions = CloudRouterBackendSdkClientOptions;

export function createSdkworkDriveBackendSdkClient(
  options: DriveBackendSdkClientOptions = {},
): DriveBackendSdkClient {
  return attachCloudRouterSdkSessionAuthBoundary(new DriveBackendClient(buildDriveBackendConfig(options)));
}

export function getSdkworkDriveBackendSdkClient(
  options: DriveBackendSdkClientOptions = {},
): DriveBackendSdkClient {
  if (hasRuntimeOverrides(options)) {
    return createSdkworkDriveBackendSdkClient(options);
  }
  if (!driveBackendClient) {
    driveBackendClient = createSdkworkDriveBackendSdkClient();
  }
  return driveBackendClient;
}

export function getSdkworkDriveAppSdkClient(
  options: SdkworkDriveAppSdkClientOptions = {},
): SdkworkDriveAppClient {
  if (hasRuntimeOverrides(options)) {
    return createSdkworkDriveAppSdkClient(options);
  }
  const injected = readInjectedDriveAppSdkClient();
  if (injected) {
    return attachCloudRouterSdkSessionAuthBoundary(injected);
  }
  if (!driveAppClient) {
    driveAppClient = createSdkworkDriveAppSdkClient();
  }
  return driveAppClient;
}

export function getSdkworkAccountAppSdkClient(
  options: SdkworkAccountAppSdkClientOptions = {},
): AccountAppClient {
  if (hasRuntimeOverrides(options)) {
    return createSdkworkAccountAppSdkClient(options);
  }
  const injected = readInjectedAccountAppSdkClient();
  if (injected) {
    return attachCloudRouterSdkSessionAuthBoundary(injected);
  }
  if (!accountAppClient) {
    accountAppClient = createSdkworkAccountAppSdkClient();
  }
  return accountAppClient;
}

export function getSdkworkCatalogAppSdkClient(
  options: SdkworkCatalogAppSdkClientOptions = {},
): CatalogAppClient {
  if (hasRuntimeOverrides(options)) return createSdkworkCatalogAppSdkClient(options);
  const injected = readInjectedCatalogAppSdkClient();
  if (injected) return attachCloudRouterSdkSessionAuthBoundary(injected);
  if (!catalogAppClient) catalogAppClient = createSdkworkCatalogAppSdkClient();
  return catalogAppClient;
}

export function getSdkworkMembershipAppSdkClient(
  options: SdkworkMembershipAppSdkClientOptions = {},
): MembershipAppClient {
  if (hasRuntimeOverrides(options)) return createSdkworkMembershipAppSdkClient(options);
  const injected = readInjectedMembershipAppSdkClient();
  if (injected) return attachCloudRouterSdkSessionAuthBoundary(injected);
  if (!membershipAppClient) membershipAppClient = createSdkworkMembershipAppSdkClient();
  return membershipAppClient;
}

export function getSdkworkOrderAppSdkClient(
  options: SdkworkOrderAppSdkClientOptions = {},
): OrderAppClient {
  if (hasRuntimeOverrides(options)) return createSdkworkOrderAppSdkClient(options);
  const injected = readInjectedOrderAppSdkClient();
  if (injected) return attachCloudRouterSdkSessionAuthBoundary(injected);
  if (!orderAppClient) orderAppClient = createSdkworkOrderAppSdkClient();
  return orderAppClient;
}

export function getSdkworkPaymentAppSdkClient(
  options: SdkworkPaymentAppSdkClientOptions = {},
): PaymentAppClient {
  if (hasRuntimeOverrides(options)) return createSdkworkPaymentAppSdkClient(options);
  const injected = readInjectedPaymentAppSdkClient();
  if (injected) return attachCloudRouterSdkSessionAuthBoundary(injected);
  if (!paymentAppClient) paymentAppClient = createSdkworkPaymentAppSdkClient();
  return paymentAppClient;
}

export function getSdkworkPromotionAppSdkClient(
  options: SdkworkPromotionAppSdkClientOptions = {},
): PromotionAppClient {
  if (hasRuntimeOverrides(options)) return createSdkworkPromotionAppSdkClient(options);
  const injected = readInjectedPromotionAppSdkClient();
  if (injected) return attachCloudRouterSdkSessionAuthBoundary(injected);
  if (!promotionAppClient) promotionAppClient = createSdkworkPromotionAppSdkClient();
  return promotionAppClient;
}

export function getCloudRouterAiSdkClient(options: CloudRouterAiSdkClientOptions = {}): SdkworkAiClient {
  if (hasRuntimeOverrides(options)) {
    return createCloudRouterAiSdkClient(options);
  }
  const injected = readInjectedAiSdkClient();
  if (injected) {
    return injected;
  }
  const clientKey = createOpenGatewayClientKey();
  if (!aiClient || aiClientSessionKey !== clientKey) {
    aiClient = createCloudRouterAiSdkClient();
    aiClientSessionKey = clientKey;
  }
  return aiClient;
}

export function resetCloudRouterSdkClients(): void {
  resetCloudRouterSdkClientCaches();
  syncCloudRouterGlobalTokenManagerFromStoredSession();
}

function resetCloudRouterSdkClientCaches(): void {
  appClient = null;
  backendClient = null;
  modelsBackendClient = null;
  appbaseAppClient = null;
  appbaseBackendClient = null;
  messagingAppClient = null;
  generationsAppClient = null;
  memoryAppClient = null;
  communityAppClient = null;
  agentAppClient = null;
  agentBackendClient = null;
  promptsBackendClient = null;
  driveAppClient = null;
  driveBackendClient = null;
  membershipBackendClient = null;
  paymentBackendClient = null;
  baseDataBackendClient = null;
  promotionBackendClient = null;
  partnerBackendClient = null;
  accountAppClient = null;
  catalogAppClient = null;
  membershipAppClient = null;
  orderAppClient = null;
  paymentAppClient = null;
  promotionAppClient = null;
  aiClient = null;
  aiClientSessionKey = undefined;
}

export function getCloudRouterGlobalTokenManager(): AuthTokenManager {
  if (!cloudRouterGlobalTokenManager) {
    cloudRouterGlobalTokenManager = createTokenManager();
  }
  syncTokenManagerFromStoredSession(cloudRouterGlobalTokenManager);
  return cloudRouterGlobalTokenManager;
}

export function syncCloudRouterGlobalTokenManagerFromStoredSession(): void {
  if (cloudRouterGlobalTokenManager) {
    syncTokenManagerFromStoredSession(cloudRouterGlobalTokenManager);
  }
}

function resolveCloudRouterSessionAuthHandlerOptions() {
  return {
    clearSession: () => {
      clearStoredAppSessionToken();
    },
    readCurrentPath: () => readBrowserRequestPath(readBrowserWindow()),
    readEnv: readCloudRouterRuntimeEnv,
    redirectToLogin: () => {
      const browserWindow = readBrowserWindow();
      const location = browserWindow?.location;
      if (!location || typeof location.replace !== 'function') {
        return;
      }
      const pathname = normalizeBrowserLocationPathname(location.pathname);
      if (!isProtectedPortalPath(pathname)) {
        return;
      }
      const redirectTo = buildPortalAuthLoginRedirect({
        hash: location.hash,
        pathname,
        search: location.search,
      });
      if (cloudRouterSessionAuthRedirectTarget === redirectTo) {
        return;
      }
      cloudRouterSessionAuthRedirectTarget = redirectTo;
      location.replace(redirectTo);
    },
    resetClients: () => {
      resetCloudRouterSdkClients();
      resetCloudRouterIamRuntimeAfterSessionAuthError();
    },
    shouldRedirectOnUnauthorized: (pathname: string) => {
      if (pathname === '/auth' || pathname.startsWith('/auth/')) {
        return false;
      }
      return isProtectedPortalPath(pathname);
    },
  };
}

export function resetCloudRouterSdkSessionAuthRedirectState(): void {
  cloudRouterSessionAuthRedirectTarget = null;
  resetSdkworkSessionAuthRedirectState();
}

export function isCloudRouterSdkSessionAuthError(error: unknown): boolean {
  return isSdkworkSdkSessionAuthError(error);
}

export function handleCloudRouterSdkSessionAuthError(error: unknown): boolean {
  return handleSdkworkSessionAuthUnauthorizedError(error, resolveCloudRouterSessionAuthHandlerOptions());
}

function attachCloudRouterSdkSessionAuthBoundary<TClient extends CloudRouterSdkClientWithHttp>(client: TClient): TClient {
  return attachSdkworkSdkSessionAuthBoundary(
    client as unknown as SdkworkSdkClientWithHttp,
    resolveCloudRouterSessionAuthHandlerOptions(),
  ) as unknown as TClient;
}

function readBrowserWindow(): BrowserWindowWithLocation | undefined {
  const candidate = globalThis as typeof globalThis & { window?: BrowserWindowWithLocation };
  return candidate.window;
}

function readBrowserRequestPath(
  browserWindow: BrowserWindowWithLocation | undefined,
): string | undefined {
  const pathname = browserWindow?.location?.pathname;
  const search = browserWindow?.location?.search;
  if (!pathname) {
    return undefined;
  }
  return `${normalizeBrowserLocationPathname(pathname)}${search ?? ''}`;
}

function resetCloudRouterIamRuntimeAfterSessionAuthError(): void {
  resetCloudRouterIamRuntime();
}

function normalizeBrowserLocationPathname(pathname: string | undefined): string {
  const normalized = pathname?.trim();
  if (!normalized) {
    return '/';
  }
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

export function createCloudRouterAppSdkModelExample(modelId: string, nodeEnvReference = 'process.env'): string {
  const sdk = MODELS_APP_SDK_REFERENCE_METADATA;
  const apiKeyProperty = 'api' + 'Key';
  return [
    `import { ${sdk.name} } from '${sdk.packageName}';`,
    '',
    `const client = new ${sdk.name}({`,
    `  baseUrl: '${sdk.apiPrefix}',`,
    `  ${apiKeyProperty}: ${nodeEnvReference}.CLOUD_API_KEY,`,
    '});',
    '',
    'async function main() {',
    '  const params = {',
    `    q: ${JSON.stringify(modelId)},`,
    '    limit: 1',
    '  };',
    '  const response = await client.ai.models.list(params);',
    '  return response;',
    '}',
    '',
    'main();',
  ].join('\n');
}

function buildAppConfig(options: CloudRouterAppSdkClientOptions): SdkworkAppConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.appBaseUrl ?? readCloudRouterRuntimeEnv('VITE_CLOUDROUTER_APP_API_BASE_URL') ?? APP_API_PREFIX,
      APP_API_PREFIX,
    ),
    platform: options.platform ?? 'web',
    tokenManager: resolveCloudRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

function buildBackendConfig(options: CloudRouterBackendSdkClientOptions): SdkworkBackendConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.backendBaseUrl ?? readCloudRouterRuntimeEnv('VITE_CLOUDROUTER_BACKEND_API_BASE_URL') ?? BACKEND_API_PREFIX,
      BACKEND_API_PREFIX,
    ),
    platform: options.platform ?? 'web-admin',
    tokenManager: resolveCloudRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

function buildModelsBackendConfig(options: ModelsBackendSdkClientOptions): SdkworkBackendConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.backendBaseUrl
        ?? readCloudRouterRuntimeEnv('VITE_SDKWORK_MODELS_BACKEND_API_BASE_URL')
        ?? readCloudRouterRuntimeEnv('VITE_CLOUDROUTER_BACKEND_API_BASE_URL')
        ?? BACKEND_API_PREFIX,
      BACKEND_API_PREFIX,
    ),
    platform: options.platform ?? 'web-admin',
    tokenManager: resolveCloudRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

function buildModelsAppConfig(options: ModelsAppSdkClientOptions): SdkworkAppConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.appBaseUrl
        ?? readCloudRouterRuntimeEnv('VITE_SDKWORK_MODELS_APP_API_BASE_URL')
        ?? readCloudRouterRuntimeEnv('VITE_CLOUDROUTER_APP_API_BASE_URL')
        ?? APP_API_PREFIX,
      APP_API_PREFIX,
    ),
    platform: options.platform ?? 'web',
    tokenManager: resolveCloudRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

function buildAppbaseAppConfig(options: SdkworkAppbaseAppSdkClientOptions): SdkworkAppbaseAppConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      resolveRequiredAppbaseAppBaseUrl(options),
      APP_API_PREFIX,
    ),
    platform: options.platform ?? 'web',
    tokenManager: resolveCloudRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

export function resolveRequiredAppbaseAppBaseUrl(options: SdkworkAppbaseAppSdkClientOptions): string {
  return options.appBaseUrl
    ?? readCloudRouterRuntimeEnv('VITE_SDKWORK_APPBASE_APP_API_BASE_URL')
    ?? deriveDependencySurfaceBaseUrl('PORTAL_PUBLIC_SDK_BASE_URL', APP_API_PREFIX)
    ?? APP_API_PREFIX;
}

function buildMessagingAppConfig(options: SdkworkMessagingAppSdkClientOptions): MessagingAppConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      resolveRequiredMessagingAppBaseUrl(options),
      APP_API_PREFIX,
    ),
    platform: options.platform ?? 'web',
    tokenManager: resolveCloudRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

export function resolveRequiredMessagingAppBaseUrl(options: SdkworkMessagingAppSdkClientOptions): string {
  return options.appBaseUrl
    ?? readCloudRouterRuntimeEnv('VITE_SDKWORK_MESSAGING_APP_API_BASE_URL')
    ?? readCloudRouterRuntimeEnv('VITE_CLOUDROUTER_APP_API_BASE_URL')
    ?? deriveDependencySurfaceBaseUrl('PORTAL_PUBLIC_SDK_BASE_URL', APP_API_PREFIX)
    ?? APP_API_PREFIX;
}

function buildAppbaseBackendConfig(options: SdkworkAppbaseBackendSdkClientOptions): SdkworkAppbaseBackendConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      resolveRequiredAppbaseBackendBaseUrl(options),
      BACKEND_API_PREFIX,
    ),
    platform: options.platform ?? 'web-admin',
    tokenManager: resolveCloudRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

export function resolveRequiredAppbaseBackendBaseUrl(options: SdkworkAppbaseBackendSdkClientOptions): string {
  return options.backendBaseUrl
    ?? readCloudRouterRuntimeEnv('VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL')
    ?? deriveDependencySurfaceBaseUrl('PORTAL_PUBLIC_SDK_BASE_URL', BACKEND_API_PREFIX)
    ?? BACKEND_API_PREFIX;
}

function buildGenerationsAppConfig(options: SdkworkGenerationsAppSdkClientOptions): SdkworkGenerationsAppConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.appBaseUrl
      ?? readCloudRouterRuntimeEnv('VITE_SDKWORK_GENERATIONS_APP_API_BASE_URL')
      ?? readCloudRouterRuntimeEnv('VITE_SDKWORK_GENERATIONS_PC_APP_API_BASE_URL')
      ?? readCloudRouterRuntimeEnv('VITE_CLOUDROUTER_APP_API_BASE_URL')
      ?? APP_API_PREFIX,
      APP_API_PREFIX,
    ),
    platform: options.platform ?? 'web',
    tokenManager: resolveCloudRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

function buildMemoryAppConfig(options: SdkworkMemoryAppSdkClientOptions): SdkworkMemoryAppConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.appBaseUrl
      ?? readCloudRouterRuntimeEnv('VITE_SDKWORK_MEMORY_APP_API_BASE_URL')
      ?? readCloudRouterRuntimeEnv('VITE_CLOUDROUTER_APP_API_BASE_URL')
      ?? APP_API_PREFIX,
      APP_API_PREFIX,
    ),
    platform: options.platform ?? 'web',
    tokenManager: resolveCloudRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

function buildCommunityAppConfig(options: SdkworkCommunityAppSdkClientOptions): SdkworkCommunityAppConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.appBaseUrl
      ?? readCloudRouterRuntimeEnv('VITE_SDKWORK_COMMUNITY_APP_API_BASE_URL')
      ?? readCloudRouterRuntimeEnv('VITE_CLOUDROUTER_APP_API_BASE_URL')
      ?? APP_API_PREFIX,
      APP_API_PREFIX,
    ),
    platform: options.platform ?? 'web',
    tokenManager: resolveCloudRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

function buildPromptsAppConfig(options: SdkworkPromptsAppSdkClientOptions): SdkworkPromptsAppConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.appBaseUrl
      ?? readCloudRouterRuntimeEnv('VITE_SDKWORK_PROMPTS_APP_API_BASE_URL')
      ?? readCloudRouterRuntimeEnv('VITE_CLOUDROUTER_APP_API_BASE_URL')
      ?? APP_API_PREFIX,
      APP_API_PREFIX,
    ),
    platform: options.platform ?? 'web',
    tokenManager: resolveCloudRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

function buildAgentAppConfig(options: SdkworkAgentAppSdkClientOptions): SdkworkAgentAppConfig {
  return {
    baseUrl:
      options.appBaseUrl
      ?? readCloudRouterRuntimeEnv('VITE_SDKWORK_AGENT_APP_API_BASE_URL')
      ?? readCloudRouterRuntimeEnv('VITE_CLOUDROUTER_APP_API_BASE_URL')
      ?? APP_API_PREFIX,
    platform: options.platform ?? 'web',
    tokenManager: resolveCloudRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

function buildAgentBackendConfig(options: SdkworkAgentBackendSdkClientOptions): SdkworkAgentBackendConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.backendBaseUrl
      ?? readCloudRouterRuntimeEnv('VITE_SDKWORK_AGENT_BACKEND_API_BASE_URL')
      ?? readCloudRouterRuntimeEnv('VITE_CLOUDROUTER_BACKEND_API_BASE_URL')
      ?? BACKEND_API_PREFIX,
      BACKEND_API_PREFIX,
    ),
    platform: options.platform ?? 'web',
    tokenManager: resolveCloudRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

function buildPromptsBackendConfig(options: SdkworkPromptsBackendSdkClientOptions): SdkworkPromptsBackendConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.backendBaseUrl
      ?? readCloudRouterRuntimeEnv('VITE_SDKWORK_PROMPTS_BACKEND_API_BASE_URL')
      ?? readCloudRouterRuntimeEnv('VITE_SDKWORK_PROMPTS_API_BASE_URL')
      ?? readCloudRouterRuntimeEnv('VITE_CLOUDROUTER_BACKEND_API_BASE_URL')
      ?? BACKEND_API_PREFIX,
      BACKEND_API_PREFIX,
    ),
    platform: options.platform ?? 'web-admin',
    tokenManager: resolveCloudRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

function buildDriveAppConfig(options: SdkworkDriveAppSdkClientOptions): SdkworkDriveAppConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.appBaseUrl
      ?? readCloudRouterRuntimeEnv('VITE_SDKWORK_DRIVE_APP_API_BASE_URL')
      ?? readCloudRouterRuntimeEnv('VITE_CLOUDROUTER_APP_API_BASE_URL')
      ?? APP_API_PREFIX,
      APP_API_PREFIX,
    ),
    platform: options.platform ?? 'web',
    tokenManager: resolveCloudRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

function buildDriveBackendConfig(options: DriveBackendSdkClientOptions): SdkworkBackendConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.backendBaseUrl
      ?? readCloudRouterRuntimeEnv('VITE_SDKWORK_DRIVE_BACKEND_API_BASE_URL')
      ?? readCloudRouterRuntimeEnv('VITE_CLOUDROUTER_BACKEND_API_BASE_URL')
      ?? BACKEND_API_PREFIX,
      BACKEND_API_PREFIX,
    ),
    platform: options.platform ?? 'web-admin',
    tokenManager: resolveCloudRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

function buildDependencyBackendConfig(
  options: CloudRouterBackendSdkClientOptions,
  baseUrlEnvName: string,
): SdkworkBackendConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.backendBaseUrl
        ?? readCloudRouterRuntimeEnv(baseUrlEnvName)
        ?? readCloudRouterRuntimeEnv('VITE_CLOUDROUTER_BACKEND_API_BASE_URL')
        ?? deriveDependencySurfaceBaseUrl('PORTAL_PUBLIC_SDK_BASE_URL', BACKEND_API_PREFIX)
        ?? BACKEND_API_PREFIX,
      BACKEND_API_PREFIX,
    ),
    platform: options.platform ?? 'web-admin',
    tokenManager: resolveCloudRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

function buildAccountAppConfig(options: SdkworkAccountAppSdkClientOptions): AccountAppConfig {
  return buildDependencyAppConfig(options, 'VITE_SDKWORK_ACCOUNT_APP_API_BASE_URL');
}

function buildCatalogAppConfig(options: SdkworkCatalogAppSdkClientOptions): CatalogAppConfig {
  return buildDependencyAppConfig(options, 'VITE_SDKWORK_CATALOG_APP_API_BASE_URL');
}

function buildMembershipAppConfig(options: SdkworkMembershipAppSdkClientOptions): MembershipAppConfig {
  return buildDependencyAppConfig(options, 'VITE_SDKWORK_MEMBERSHIP_APP_API_BASE_URL');
}

function buildOrderAppConfig(options: SdkworkOrderAppSdkClientOptions): OrderAppConfig {
  return buildDependencyAppConfig(options, 'VITE_SDKWORK_ORDER_APP_API_BASE_URL');
}

function buildPaymentAppConfig(options: SdkworkPaymentAppSdkClientOptions): PaymentAppConfig {
  return buildDependencyAppConfig(options, 'VITE_SDKWORK_PAYMENT_APP_API_BASE_URL');
}

function buildPromotionAppConfig(options: SdkworkPromotionAppSdkClientOptions): PromotionAppConfig {
  return buildDependencyAppConfig(options, 'VITE_SDKWORK_PROMOTION_APP_API_BASE_URL');
}

function buildDependencyAppConfig(
  options: CloudRouterAppSdkClientOptions,
  baseUrlEnvName: string,
): SdkworkAppConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.appBaseUrl
        ?? readCloudRouterRuntimeEnv(baseUrlEnvName)
        ?? readCloudRouterRuntimeEnv('VITE_CLOUDROUTER_APP_API_BASE_URL')
        ?? deriveDependencySurfaceBaseUrl('PORTAL_PUBLIC_SDK_BASE_URL', APP_API_PREFIX)
        ?? APP_API_PREFIX,
      APP_API_PREFIX,
    ),
    platform: options.platform ?? 'web',
    tokenManager: resolveCloudRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

function deriveDependencySurfaceBaseUrl(rootEnvName: string, apiPrefix: string): string | undefined {
  const root = readCloudRouterRuntimeEnv(rootEnvName)?.replace(/\/+$/g, '');
  if (!root) {
    return undefined;
  }
  const prefix = apiPrefix.startsWith('/') ? apiPrefix : `/${apiPrefix}`;
  return `${root}${prefix}`;
}

function buildAiConfig(options: CloudRouterAiSdkClientOptions): SdkworkAiConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.aiBaseUrl ?? readCloudRouterRuntimeEnv('VITE_CLOUDROUTER_OPEN_API_BASE_URL') ?? OPEN_API_PREFIX,
      OPEN_API_PREFIX,
    ),
    apiKey: options.apiKey,
    platform: options.platform ?? 'web-open',
    timeout: options.timeout,
  };
}

function hasRuntimeOverrides(
  options:
    | CloudRouterAppSdkClientOptions
    | CloudRouterBackendSdkClientOptions
    | SdkworkAppbaseAppSdkClientOptions
    | SdkworkAppbaseBackendSdkClientOptions
    | SdkworkGenerationsAppSdkClientOptions
    | SdkworkMemoryAppSdkClientOptions
    | SdkworkCommunityAppSdkClientOptions
    | SdkworkPromptsAppSdkClientOptions
    | SdkworkAgentAppSdkClientOptions
    | SdkworkAgentBackendSdkClientOptions
    | SdkworkMembershipBackendSdkClientOptions
    | SdkworkPaymentBackendSdkClientOptions
    | SdkworkPromotionBackendSdkClientOptions
    | SdkworkPartnerBackendSdkClientOptions
    | SdkworkDriveAppSdkClientOptions
    | SdkworkAccountAppSdkClientOptions
    | SdkworkCatalogAppSdkClientOptions
    | SdkworkMembershipAppSdkClientOptions
    | SdkworkOrderAppSdkClientOptions
    | SdkworkPaymentAppSdkClientOptions
    | SdkworkPromotionAppSdkClientOptions
    | SdkworkMessagingAppSdkClientOptions
    | CloudRouterAiSdkClientOptions,
): boolean {
  return Object.keys(options).length > 0;
}

function resolveCloudRouterSdkTokenManager(tokenManager: AuthTokenManager | undefined): AuthTokenManager {
  return tokenManager ?? getCloudRouterGlobalTokenManager();
}

function syncTokenManagerFromStoredSession(tokenManager: AuthTokenManager): void {
  const tokens = readStoredAuthTokens();
  if (tokens.authToken || tokens.accessToken || tokens.refreshToken) {
    tokenManager.setTokens(tokens);
    return;
  }
  tokenManager.clearTokens();
}

export function getCloudRouterBootstrapAccessToken(): string | undefined {
  return readBootstrapAccessTokenFromProcessEnv();
}

export function prepareCloudRouterCredentialEntryTokens(): void {
  const storedSession = loadStoredAppSessionToken();
  if (storedSession?.authToken && storedSession.accessToken) {
    return;
  }

  prepareCredentialEntryTokens(getCloudRouterGlobalTokenManager(), readBootstrapAccessTokenFromProcessEnv);
  resetCloudRouterSdkClientCaches();
}

function readBootstrapAccessToken(): string | undefined {
  return readBootstrapAccessTokenFromProcessEnv();
}

function readStoredAuthTokens(): AuthTokens {
  const stored = loadStoredAppSessionToken();
  const tokens: AuthTokens = {
    ...(stored?.accessToken ? { accessToken: stored.accessToken } : {}),
    ...(stored?.authToken ? { authToken: stored.authToken } : {}),
    ...(stored?.refreshToken ? { refreshToken: stored.refreshToken } : {}),
  };
  if (!tokens.accessToken) {
    const bootstrapAccessToken = readBootstrapAccessToken();
    if (bootstrapAccessToken) {
      tokens.accessToken = bootstrapAccessToken;
    }
  }
  return tokens;
}

function createOpenGatewayClientKey(): string {
  return [
    readCloudRouterRuntimeEnv('VITE_CLOUDROUTER_OPEN_API_BASE_URL') ?? OPEN_API_PREFIX,
    OPEN_API_PREFIX,
  ].join(':');
}

function readInjectedAppSdkClient(): CloudRouterAppSdkClient | undefined {
  return (globalThis as CloudRouterSdkRuntimeHost).__SDKWORK_CLOUDROUTER_ROUTER_APP_SDK_CLIENT__ ?? undefined;
}

function readInjectedBackendSdkClient(): CloudRouterBackendSdkClient | undefined {
  return (globalThis as CloudRouterSdkRuntimeHost).__SDKWORK_CLOUDROUTER_ROUTER_BACKEND_SDK_CLIENT__ ?? undefined;
}

function readInjectedAppbaseAppSdkClient(): SdkworkAppbaseAppSdkClient | undefined {
  return (globalThis as CloudRouterSdkRuntimeHost).__SDKWORK_APPBASE_APP_SDK_CLIENT__ ?? undefined;
}

function readInjectedAppbaseBackendSdkClient(): SdkworkAppbaseBackendSdkClient | undefined {
  return (globalThis as CloudRouterSdkRuntimeHost).__SDKWORK_APPBASE_BACKEND_SDK_CLIENT__ ?? undefined;
}

function readInjectedMessagingAppSdkClient(): SdkworkMessagingAppSdkClient | undefined {
  return (globalThis as CloudRouterSdkRuntimeHost).__SDKWORK_MESSAGING_APP_SDK_CLIENT__ ?? undefined;
}

function readInjectedGenerationsAppSdkClient(): SdkworkGenerationsAppSdkClient | undefined {
  return (globalThis as CloudRouterSdkRuntimeHost).__SDKWORK_GENERATIONS_APP_SDK_CLIENT__ ?? undefined;
}

function readInjectedMemoryAppSdkClient(): SdkworkMemoryAppSdkClient | undefined {
  return (globalThis as CloudRouterSdkRuntimeHost).__SDKWORK_MEMORY_APP_SDK_CLIENT__ ?? undefined;
}

function readInjectedCommunityAppSdkClient(): SdkworkCommunityAppSdkClient | undefined {
  return (globalThis as CloudRouterSdkRuntimeHost).__SDKWORK_COMMUNITY_APP_SDK_CLIENT__ ?? undefined;
}

function readInjectedAgentAppSdkClient(): SdkworkAgentAppSdkClient | undefined {
  return (globalThis as CloudRouterSdkRuntimeHost).__SDKWORK_AGENT_APP_SDK_CLIENT__ ?? undefined;
}

function readInjectedAgentBackendSdkClient(): SdkworkAgentBackendSdkClient | undefined {
  return (globalThis as CloudRouterSdkRuntimeHost).__SDKWORK_AGENT_BACKEND_SDK_CLIENT__ ?? undefined;
}

function readInjectedDriveAppSdkClient(): SdkworkDriveAppSdkClient | undefined {
  return (globalThis as CloudRouterSdkRuntimeHost).__SDKWORK_DRIVE_APP_SDK_CLIENT__ ?? undefined;
}

function readInjectedAccountAppSdkClient(): SdkworkAccountAppSdkClient | undefined {
  return (globalThis as CloudRouterSdkRuntimeHost).__SDKWORK_ACCOUNT_APP_SDK_CLIENT__ ?? undefined;
}

function readInjectedCatalogAppSdkClient(): SdkworkCatalogAppSdkClient | undefined {
  return (globalThis as CloudRouterSdkRuntimeHost).__SDKWORK_CATALOG_APP_SDK_CLIENT__ ?? undefined;
}

function readInjectedMembershipAppSdkClient(): SdkworkMembershipAppSdkClient | undefined {
  return (globalThis as CloudRouterSdkRuntimeHost).__SDKWORK_MEMBERSHIP_APP_SDK_CLIENT__ ?? undefined;
}

function readInjectedOrderAppSdkClient(): SdkworkOrderAppSdkClient | undefined {
  return (globalThis as CloudRouterSdkRuntimeHost).__SDKWORK_ORDER_APP_SDK_CLIENT__ ?? undefined;
}

function readInjectedPaymentAppSdkClient(): SdkworkPaymentAppSdkClient | undefined {
  return (globalThis as CloudRouterSdkRuntimeHost).__SDKWORK_PAYMENT_APP_SDK_CLIENT__ ?? undefined;
}

function readInjectedPromotionAppSdkClient(): SdkworkPromotionAppSdkClient | undefined {
  return (globalThis as CloudRouterSdkRuntimeHost).__SDKWORK_PROMOTION_APP_SDK_CLIENT__ ?? undefined;
}

function readInjectedAiSdkClient(): CloudRouterAiSdkClient | undefined {
  return (globalThis as CloudRouterSdkRuntimeHost).__SDKWORK_CLOUDROUTER_ROUTER_AI_SDK_CLIENT__ ?? undefined;
}

subscribeStoredAppSessionChange(() => {
  syncCloudRouterGlobalTokenManagerFromStoredSession();
});

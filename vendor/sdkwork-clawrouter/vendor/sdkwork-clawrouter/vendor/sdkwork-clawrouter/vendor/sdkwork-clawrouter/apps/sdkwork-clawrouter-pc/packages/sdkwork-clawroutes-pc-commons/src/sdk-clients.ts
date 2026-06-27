import {
  omitAuthProjectionBody,
  omitAuthProjectionQuery,
} from './auth-projection.ts';
import { createTokenManager, type AuthTokenManager, type AuthTokens } from '@sdkwork/sdk-common';
import {
  type CommerceAppSdkClient,
  type CommerceBackendSdkClient,
  configureSdkworkCommerceServiceProvider,
  createSdkworkCommerceService,
  type SdkworkCommerceService,
} from '@sdkwork/commerce-service';
import { SdkworkAppClient, type SdkworkAppConfig } from '@sdkwork/clawrouter-app-sdk';
import { SdkworkBackendClient, type SdkworkBackendConfig } from '@sdkwork/clawrouter-backend-sdk';
import { SdkworkDriveBackendClient as DriveBackendClient } from '@sdkwork/clawrouter-pc-core/sdk';
import { SdkworkBackendClient as ModelsBackendClient } from '@sdkwork/models-backend-sdk';
import { SdkworkAppClient as ModelsAppClient } from '@sdkwork/models-app-sdk';
import { SdkworkAiClient, type SdkworkAiConfig } from '@sdkwork/clawrouter-open-sdk';
import {
  SdkworkGenerationsAppSdkClient as SdkworkGenerationsAppClient,
  type SdkworkGenerationsAppSdkConfig as SdkworkGenerationsAppConfig,
} from '@sdkwork/clawrouter-pc-core/sdk';
import {
  SdkworkAppClient as SdkworkMemoryAppClient,
  type SdkworkAppConfig as SdkworkMemoryAppConfig,
} from '@sdkwork/memory-app-sdk';
import {
  SdkworkAppClient as SdkworkAgentAppClient,
  type SdkworkAppConfig as SdkworkAgentAppConfig,
} from '@sdkwork/agent-app-sdk';
import {
  SdkworkBackendClient as SdkworkAgentBackendClient,
  type SdkworkBackendConfig as SdkworkAgentBackendConfig,
} from '@sdkwork/agent-backend-sdk';
import {
  SdkworkBackendClient as SdkworkPromptsBackendClient,
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
  createDriveAppClient,
  type SdkworkAppConfig as SdkworkDriveAppConfig,
  type SdkworkDriveAppClient,
} from '@sdkwork/drive-app-sdk';
import {
  SdkworkCommerceAppSdkClient as SdkworkCommerceAppClient,
  type SdkworkCommerceAppSdkConfig as SdkworkCommerceAppConfig,
} from '@sdkwork/clawrouter-pc-core/sdk';
import {
  SdkworkCommerceBackendSdkClient as SdkworkCommerceGeneratedBackendClient,
  type SdkworkCommerceBackendSdkConfig as SdkworkCommerceBackendConfig,
} from '@sdkwork/clawrouter-pc-core/sdk';
import {
  clearStoredAppSessionToken,
  loadStoredAppSessionToken,
  subscribeStoredAppSessionChange,
} from './app-session-token.ts';
import { resetClawRouterIamRuntime } from './iam-runtime.ts';
import { buildPortalAuthLoginRedirect, isProtectedPortalPath } from './portal-auth.ts';
import { normalizeGeneratedSdkBaseUrl } from './sdk-base-url.ts';
import {
  attachSdkworkSdkSessionAuthBoundary,
  handleSdkworkSessionAuthUnauthorizedError,
  isSdkworkSdkSessionAuthError,
  resetSdkworkSessionAuthRedirectState,
} from '@sdkwork/auth-runtime-pc-react';
import { readClawRouterRuntimeEnv } from './utils/env.ts';
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

export type ClawRouterGeneratedSdkType =
  | 'app'
  | 'backend'
  | 'ai'
  | 'drive'
  | 'memory'
  | 'agent'
  | 'payment'
  | 'iaas'
  | 'paas';

export interface ClawRouterGeneratedSdkMetadata {
  name: string;
  packageName: string;
  version: string;
  sdkType: ClawRouterGeneratedSdkType;
  apiPrefix: string;
  runtimeEnvName: string;
  sourceDir: string;
  archiveLanguage: 'typescript';
  archiveName: string;
  description: string;
}

export const CLAWROUTER_APP_SDK_REFERENCE_METADATA: ClawRouterGeneratedSdkMetadata = {
  name: 'SdkworkAppClient',
  packageName: '@sdkwork/clawrouter-app-sdk',
  version: '0.1.0',
  sdkType: 'app',
  apiPrefix: APP_API_PREFIX,
  runtimeEnvName: 'VITE_CLAWROUTER_APP_API_BASE_URL',
  sourceDir: 'sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/generated/server-openapi',
  archiveLanguage: 'typescript',
  archiveName: 'sdkwork-clawrouter-app-sdk-typescript-0.1.0.zip',
  description: 'SDKWork Claw Router app API SDK',
};

export const CLAWROUTER_BACKEND_SDK_REFERENCE_METADATA: ClawRouterGeneratedSdkMetadata = {
  name: 'SdkworkBackendClient',
  packageName: '@sdkwork/clawrouter-backend-sdk',
  version: '0.1.0',
  sdkType: 'backend',
  apiPrefix: BACKEND_API_PREFIX,
  runtimeEnvName: 'VITE_CLAWROUTER_BACKEND_API_BASE_URL',
  sourceDir: 'sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/generated/server-openapi',
  archiveLanguage: 'typescript',
  archiveName: 'sdkwork-clawrouter-backend-sdk-typescript-0.1.0.zip',
  description: 'SDKWork Claw Router backend API SDK',
};

export const MODELS_APP_SDK_REFERENCE_METADATA: ClawRouterGeneratedSdkMetadata = {
  name: 'SdkworkAppClient',
  packageName: '@sdkwork/models-app-sdk',
  version: '0.1.0',
  sdkType: 'app',
  apiPrefix: APP_API_PREFIX,
  runtimeEnvName: 'VITE_SDKWORK_MODELS_APP_API_BASE_URL',
  sourceDir: 'sdks/sdkwork-models-app-sdk/sdkwork-models-app-sdk-typescript/generated/server-openapi',
  archiveLanguage: 'typescript',
  archiveName: 'sdkwork-models-app-sdk-typescript-0.1.0.zip',
  description: 'SDKWork Models app catalog API SDK',
};

export const CLAWROUTER_AI_SDK_REFERENCE_METADATA: ClawRouterGeneratedSdkMetadata = {
  name: 'SdkworkAiClient',
  packageName: '@sdkwork/clawrouter-open-sdk',
  version: '0.1.0',
  sdkType: 'ai',
  apiPrefix: OPEN_API_PREFIX,
  runtimeEnvName: 'VITE_CLAWROUTER_OPEN_API_BASE_URL',
  sourceDir: 'sdks/clawrouter-open-sdk/clawrouter-open-sdk-typescript/generated/server-openapi',
  archiveLanguage: 'typescript',
  archiveName: 'sdkwork-clawrouter-open-sdk-typescript-0.1.0.zip',
  description: 'SDKWork OpenAI-compatible AI API SDK',
};

export const CLAWROUTER_LLM_OPEN_API_SDK_REFERENCE_METADATA: ClawRouterGeneratedSdkMetadata = {
  ...CLAWROUTER_AI_SDK_REFERENCE_METADATA,
  description: 'SDKWork LLM Open API SDK',
};

export const CLAWROUTER_IMAGE_OPEN_API_SDK_REFERENCE_METADATA: ClawRouterGeneratedSdkMetadata = {
  ...CLAWROUTER_AI_SDK_REFERENCE_METADATA,
  description: 'SDKWork Image Open API SDK',
};

export const CLAWROUTER_VIDEO_OPEN_API_SDK_REFERENCE_METADATA: ClawRouterGeneratedSdkMetadata = {
  ...CLAWROUTER_AI_SDK_REFERENCE_METADATA,
  description: 'SDKWork Video Open API SDK',
};

export const CLAWROUTER_AUDIO_OPEN_API_SDK_REFERENCE_METADATA: ClawRouterGeneratedSdkMetadata = {
  ...CLAWROUTER_AI_SDK_REFERENCE_METADATA,
  description: 'SDKWork Audio Open API SDK',
};

export const CLAWROUTER_DRIVE_OPEN_API_SDK_REFERENCE_METADATA: ClawRouterGeneratedSdkMetadata = {
  name: 'SdkworkDriveOpenClient',
  packageName: '@sdkwork-internal/drive-sdk-generated',
  version: '0.1.0',
  sdkType: 'drive',
  apiPrefix: DRIVE_OPEN_API_PREFIX,
  runtimeEnvName: 'VITE_SDKWORK_DRIVE_OPEN_API_BASE_URL',
  sourceDir: '../sdkwork-drive/sdks/sdkwork-drive-sdk/sdkwork-drive-sdk-typescript/generated/server-openapi',
  archiveLanguage: 'typescript',
  archiveName: 'sdkwork-drive-sdk-typescript-0.1.0.zip',
  description: 'SDKWork Drive Open API SDK',
};

export const CLAWROUTER_KNOWLEDGEBASE_OPEN_API_SDK_REFERENCE_METADATA: ClawRouterGeneratedSdkMetadata = {
  ...CLAWROUTER_AI_SDK_REFERENCE_METADATA,
  description: 'SDKWork Knowledgebase Open API SDK',
};

export const CLAWROUTER_MEMORY_OPEN_API_SDK_REFERENCE_METADATA: ClawRouterGeneratedSdkMetadata = {
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

export const CLAWROUTER_AGENT_OPEN_API_SDK_REFERENCE_METADATA: ClawRouterGeneratedSdkMetadata = {
  name: 'SdkworkAgentClient',
  packageName: '@sdkwork/agent-sdk',
  version: '0.1.0',
  sdkType: 'agent',
  apiPrefix: AGENT_OPEN_API_PREFIX,
  runtimeEnvName: 'VITE_SDKWORK_AGENT_OPEN_API_BASE_URL',
  sourceDir: '../sdkwork-kernel/sdks/sdkwork-agent-sdk/sdkwork-agent-sdk-typescript/generated/server-openapi',
  archiveLanguage: 'typescript',
  archiveName: 'sdkwork-agent-sdk-typescript-0.1.0.zip',
  description: 'SDKWork Agent Open API SDK',
};

export const CLAWROUTER_PAYMENT_OPEN_API_SDK_REFERENCE_METADATA: ClawRouterGeneratedSdkMetadata = {
  name: 'SdkworkPaymentClient',
  packageName: '@sdkwork/clawrouter-payment-sdk',
  version: '0.1.0',
  sdkType: 'payment',
  apiPrefix: PAYMENT_API_PREFIX,
  runtimeEnvName: 'VITE_CLAWROUTER_PAYMENT_API_BASE_URL',
  sourceDir: 'crates/sdkwork-claw-http/specs/payment-aggregate-openapi.json',
  archiveLanguage: 'typescript',
  archiveName: 'sdkwork-clawrouter-payment-sdk-typescript-0.1.0.zip',
  description: 'SDKWork Payment Open API SDK',
};

export const CLAWROUTER_IAAS_OPEN_API_SDK_REFERENCE_METADATA: ClawRouterGeneratedSdkMetadata = {
  name: 'SdkworkCloudServicesClient',
  packageName: '@sdkwork/clawrouter-cloud-services-sdk',
  version: '0.1.0',
  sdkType: 'iaas',
  apiPrefix: CLOUD_API_PREFIX,
  runtimeEnvName: 'VITE_CLAWROUTER_CLOUD_API_BASE_URL',
  sourceDir: 'crates/sdkwork-claw-http/specs/cloud-services-openapi.json',
  archiveLanguage: 'typescript',
  archiveName: 'sdkwork-clawrouter-cloud-services-sdk-typescript-0.1.0.zip',
  description: 'SDKWork IaaS Open API SDK',
};

export const CLAWROUTER_CLOUD_SERVICES_SDK_REFERENCE_METADATA: ClawRouterGeneratedSdkMetadata = {
  ...CLAWROUTER_IAAS_OPEN_API_SDK_REFERENCE_METADATA,
  description: 'SDKWork S3-compatible cloud services API SDK',
};

export const CLAWROUTER_PAAS_OPEN_API_SDK_REFERENCE_METADATA: ClawRouterGeneratedSdkMetadata = {
  name: 'SdkworkPaasClient',
  packageName: '@sdkwork/clawrouter-paas-sdk',
  version: '0.1.0',
  sdkType: 'paas',
  apiPrefix: PAAS_API_PREFIX,
  runtimeEnvName: 'VITE_CLAWROUTER_PAAS_API_BASE_URL',
  sourceDir: 'crates/sdkwork-claw-http/specs/paas-openapi.json',
  archiveLanguage: 'typescript',
  archiveName: 'sdkwork-clawrouter-paas-sdk-typescript-0.1.0.zip',
  description: 'SDKWork PaaS Open API SDK',
};

export const SDK_SYSTEM_CONFIG = {
  'llm-open-api': CLAWROUTER_LLM_OPEN_API_SDK_REFERENCE_METADATA,
  'image-open-api': CLAWROUTER_IMAGE_OPEN_API_SDK_REFERENCE_METADATA,
  'video-open-api': CLAWROUTER_VIDEO_OPEN_API_SDK_REFERENCE_METADATA,
  'audio-open-api': CLAWROUTER_AUDIO_OPEN_API_SDK_REFERENCE_METADATA,
  'drive-open-api': CLAWROUTER_DRIVE_OPEN_API_SDK_REFERENCE_METADATA,
  'knowledgebase-open-api': CLAWROUTER_KNOWLEDGEBASE_OPEN_API_SDK_REFERENCE_METADATA,
  'memory-open-api': CLAWROUTER_MEMORY_OPEN_API_SDK_REFERENCE_METADATA,
  'agent-open-api': CLAWROUTER_AGENT_OPEN_API_SDK_REFERENCE_METADATA,
  'sdkwork-drive-open-api': CLAWROUTER_DRIVE_OPEN_API_SDK_REFERENCE_METADATA,
  'sdkwork-drive.open': CLAWROUTER_DRIVE_OPEN_API_SDK_REFERENCE_METADATA,
  'sdkwork-knowledgebase-open-api': CLAWROUTER_KNOWLEDGEBASE_OPEN_API_SDK_REFERENCE_METADATA,
  'sdkwork-memory-open-api': CLAWROUTER_MEMORY_OPEN_API_SDK_REFERENCE_METADATA,
  'sdkwork-agent-open-api': CLAWROUTER_AGENT_OPEN_API_SDK_REFERENCE_METADATA,
  'payment-open-api': CLAWROUTER_PAYMENT_OPEN_API_SDK_REFERENCE_METADATA,
  'iaas-open-api': CLAWROUTER_IAAS_OPEN_API_SDK_REFERENCE_METADATA,
  'paas-open-api': CLAWROUTER_PAAS_OPEN_API_SDK_REFERENCE_METADATA,
  'app-api': CLAWROUTER_APP_SDK_REFERENCE_METADATA,
  'backend-api': CLAWROUTER_BACKEND_SDK_REFERENCE_METADATA,
  gateway: CLAWROUTER_LLM_OPEN_API_SDK_REFERENCE_METADATA,
  'cloud-services': CLAWROUTER_IAAS_OPEN_API_SDK_REFERENCE_METADATA,
  'paas-api': CLAWROUTER_PAAS_OPEN_API_SDK_REFERENCE_METADATA,
  'payment-aggregate': CLAWROUTER_PAYMENT_OPEN_API_SDK_REFERENCE_METADATA,
  'voice-open-api': CLAWROUTER_AUDIO_OPEN_API_SDK_REFERENCE_METADATA,
  app: CLAWROUTER_APP_SDK_REFERENCE_METADATA,
  backend: CLAWROUTER_BACKEND_SDK_REFERENCE_METADATA,
} as const satisfies Record<string, ClawRouterGeneratedSdkMetadata>;

export interface ClawRouterAppSdkClientOptions {
  appBaseUrl?: string;
  platform?: string;
  tokenManager?: AuthTokenManager;
  timeout?: number;
}

export interface ClawRouterBackendSdkClientOptions {
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

export interface SdkworkCommerceAppSdkClientOptions {
  appBaseUrl?: string;
  platform?: string;
  tokenManager?: AuthTokenManager;
  timeout?: number;
}

export interface SdkworkCommerceBackendSdkClientOptions {
  backendBaseUrl?: string;
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

export interface ClawRouterAiSdkClientOptions {
  aiBaseUrl?: string;
  apiKey?: string;
  platform?: string;
  timeout?: number;
}

export type ClawRouterAppSdkClient = SdkworkAppClient & {
  readonly commerce: SdkworkCommerceAppClient;
};
type PublicSdkResource<TResource> = TResource extends (...args: infer TArgs) => infer TResult
  ? (...args: TArgs) => TResult
  : TResource extends object
    ? { readonly [K in keyof TResource]: PublicSdkResource<TResource[K]> }
    : TResource;
type CommerceBackendSdkPublicResource = PublicSdkResource<SdkworkCommerceGeneratedBackendClient>;
type BackendCommerceDependencyOverlay = CommerceBackendSdkPublicResource & {
  readonly orders: CommerceBackendSdkPublicResource['orders'] & {
    readonly list: CommerceBackendSdkPublicResource['orders']['management']['list'];
    readonly retrieve: CommerceBackendSdkPublicResource['orders']['management']['retrieve'];
    readonly events: CommerceBackendSdkPublicResource['orders']['events'] & {
      readonly list: CommerceBackendSdkPublicResource['orders']['events']['management']['list'];
    };
  };
  readonly refunds: CommerceBackendSdkPublicResource['refunds'] & {
    readonly list: CommerceBackendSdkPublicResource['refunds']['management']['list'];
    readonly retrieve: CommerceBackendSdkPublicResource['refunds']['management']['retrieve'];
  };
  readonly fulfillments: CommerceBackendSdkPublicResource['fulfillments'] & {
    readonly list: CommerceBackendSdkPublicResource['fulfillments']['management']['list'];
    readonly retrieve: CommerceBackendSdkPublicResource['fulfillments']['management']['retrieve'];
  };
  readonly invoices: CommerceBackendSdkPublicResource['invoices'] & {
    readonly list: CommerceBackendSdkPublicResource['invoices']['management']['list'];
    readonly retrieve: CommerceBackendSdkPublicResource['invoices']['management']['retrieve'];
  };
  readonly inventory: CommerceBackendSdkPublicResource['inventory'];
  readonly memberships: CommerceBackendSdkPublicResource['memberships'] & {
    readonly plans: CommerceBackendSdkPublicResource['memberships']['plans'] & {
      readonly list: CommerceBackendSdkPublicResource['memberships']['plans']['management']['list'];
    };
    readonly packages: CommerceBackendSdkPublicResource['memberships']['packages'] & {
      readonly list: CommerceBackendSdkPublicResource['memberships']['packages']['management']['list'];
    };
    readonly packageGroups: CommerceBackendSdkPublicResource['memberships']['packageGroups'] & {
      readonly list: CommerceBackendSdkPublicResource['memberships']['packageGroups']['management']['list'];
    };
  };
  readonly payments: CommerceBackendSdkPublicResource['payments'] & {
    readonly methods: CommerceBackendSdkPublicResource['payments']['methods'] & {
      readonly list: CommerceBackendSdkPublicResource['payments']['methods']['management']['list'];
    };
  };
  readonly recharges: CommerceBackendSdkPublicResource['recharges'] & {
    readonly orders: CommerceBackendSdkPublicResource['recharges']['orders'] & {
      readonly list: CommerceBackendSdkPublicResource['recharges']['orders']['management']['list'];
      readonly retrieve: CommerceBackendSdkPublicResource['recharges']['orders']['management']['retrieve'];
    };
    readonly packages: CommerceBackendSdkPublicResource['recharges']['packages'] & {
      readonly list: CommerceBackendSdkPublicResource['recharges']['packages']['management']['list'];
    };
    readonly settings: CommerceBackendSdkPublicResource['recharges']['settings'] & {
      readonly retrieve: CommerceBackendSdkPublicResource['recharges']['settings']['management']['retrieve'];
    };
  };
  readonly wallet: CommerceBackendSdkPublicResource['wallet'] & {
    readonly accounts: CommerceBackendSdkPublicResource['wallet']['accounts'] & {
      readonly list: CommerceBackendSdkPublicResource['wallet']['accounts']['management']['list'];
    };
    readonly ledgerEntries: CommerceBackendSdkPublicResource['wallet']['ledgerEntries'] & {
      readonly list: CommerceBackendSdkPublicResource['wallet']['ledgerEntries']['management']['list'];
    };
    readonly exchangeRules: CommerceBackendSdkPublicResource['wallet']['exchangeRules'] & {
      readonly list: CommerceBackendSdkPublicResource['wallet']['exchangeRules']['management']['list'];
    };
    readonly adjustments: CommerceBackendSdkPublicResource['wallet']['adjustments'] & {
      readonly create: CommerceBackendSdkPublicResource['wallet']['adjustments']['management']['create'];
    };
  };
};
export type ClawRouterBackendSdkClient = SdkworkBackendClient & {
  readonly commerce: BackendCommerceDependencyOverlay;
};
export type SdkworkAppbaseAppSdkClient = SdkworkAppbaseAppClient;
export type SdkworkAppbaseBackendSdkClient = SdkworkAppbaseBackendClient;
export type SdkworkGenerationsAppSdkClient = SdkworkGenerationsAppClient;
export type SdkworkMemoryAppSdkClient = SdkworkMemoryAppClient;
export type SdkworkAgentAppSdkClient = SdkworkAgentAppClient;
export type SdkworkAgentBackendSdkClient = SdkworkAgentBackendClient;
export type SdkworkPromptsBackendSdkClient = SdkworkPromptsBackendClient;
export type SdkworkDriveAppSdkClient = SdkworkDriveAppClient;
export type SdkworkCommerceAppSdkClient = SdkworkCommerceAppClient;
export type SdkworkCommerceBackendSdkClient = SdkworkCommerceGeneratedBackendClient;
export type ClawRouterAiSdkClient = SdkworkAiClient;

type ClawRouterSdkRuntimeHost = typeof globalThis & {
  __SDKWORK_CLAW_ROUTER_APP_SDK_CLIENT__?: ClawRouterAppSdkClient | null;
  __SDKWORK_CLAW_ROUTER_BACKEND_SDK_CLIENT__?: ClawRouterBackendSdkClient | null;
  __SDKWORK_APPBASE_APP_SDK_CLIENT__?: SdkworkAppbaseAppSdkClient | null;
  __SDKWORK_APPBASE_BACKEND_SDK_CLIENT__?: SdkworkAppbaseBackendSdkClient | null;
  __SDKWORK_GENERATIONS_APP_SDK_CLIENT__?: SdkworkGenerationsAppSdkClient | null;
  __SDKWORK_MEMORY_APP_SDK_CLIENT__?: SdkworkMemoryAppSdkClient | null;
  __SDKWORK_AGENT_APP_SDK_CLIENT__?: SdkworkAgentAppSdkClient | null;
  __SDKWORK_AGENT_BACKEND_SDK_CLIENT__?: SdkworkAgentBackendSdkClient | null;
  __SDKWORK_DRIVE_APP_SDK_CLIENT__?: SdkworkDriveAppSdkClient | null;
  __SDKWORK_COMMERCE_APP_SDK_CLIENT__?: SdkworkCommerceAppSdkClient | null;
  __SDKWORK_COMMERCE_BACKEND_SDK_CLIENT__?: SdkworkCommerceBackendSdkClient | null;
  __SDKWORK_CLAW_ROUTER_AI_SDK_CLIENT__?: ClawRouterAiSdkClient | null;
};

const CLAW_ROUTER_SDK_SESSION_AUTH_BOUNDARY = '__sdkworkClawRouterSdkSessionAuthBoundary';

type ClawRouterSdkHttpRequestBoundary = {
  request<T>(path: string, options?: unknown): Promise<T>;
  streamJson?<T>(path: string, options?: unknown): AsyncIterable<T>;
  [CLAW_ROUTER_SDK_SESSION_AUTH_BOUNDARY]?: true;
};

type ClawRouterSdkClientWithHttp = {
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


let appClient: ClawRouterAppSdkClient | null = null;
let backendClient: ClawRouterBackendSdkClient | null = null;
let appbaseAppClient: SdkworkAppbaseAppClient | null = null;
let appbaseBackendClient: SdkworkAppbaseBackendClient | null = null;
let generationsAppClient: SdkworkGenerationsAppClient | null = null;
let memoryAppClient: SdkworkMemoryAppClient | null = null;
let agentAppClient: SdkworkAgentAppClient | null = null;
let agentBackendClient: SdkworkAgentBackendClient | null = null;
let promptsBackendClient: SdkworkPromptsBackendClient | null = null;
let driveAppClient: SdkworkDriveAppClient | null = null;
let driveBackendClient: DriveBackendSdkClient | null = null;
let commerceAppClient: SdkworkCommerceAppClient | null = null;
let commerceBackendClient: SdkworkCommerceGeneratedBackendClient | null = null;
let aiClient: SdkworkAiClient | null = null;
let aiClientSessionKey: string | undefined;
let clawRouterGlobalTokenManager: AuthTokenManager | null = null;
let clawRouterSessionAuthRedirectTarget: string | null = null;

configureSdkworkCommerceServiceProvider(createClawRouterCommerceService);

export function createClawRouterAppSdkClient(options: ClawRouterAppSdkClientOptions = {}): ClawRouterAppSdkClient {
  const client = attachClawRouterSdkSessionAuthBoundary(new SdkworkAppClient(buildAppConfig(options)));
  return attachCommerceAppSdkDependency(client, createSdkworkCommerceAppSdkClient({
    appBaseUrl: options.appBaseUrl,
    platform: options.platform,
    tokenManager: options.tokenManager,
    timeout: options.timeout,
  }));
}

export function createClawRouterBackendSdkClient(options: ClawRouterBackendSdkClientOptions = {}): ClawRouterBackendSdkClient {
  const client = attachClawRouterSdkSessionAuthBoundary(new SdkworkBackendClient(buildBackendConfig(options)));
  return attachCommerceBackendSdkDependency(client, createSdkworkCommerceBackendSdkClient({
    backendBaseUrl: options.backendBaseUrl,
    platform: options.platform,
    tokenManager: options.tokenManager,
    timeout: options.timeout,
  }));
}

export function createSdkworkAppbaseAppSdkClient(
  options: SdkworkAppbaseAppSdkClientOptions = {},
): SdkworkAppbaseAppClient {
  return attachClawRouterSdkSessionAuthBoundary(new SdkworkAppbaseAppClient(buildAppbaseAppConfig(options)));
}

export function createSdkworkAppbaseBackendSdkClient(
  options: SdkworkAppbaseBackendSdkClientOptions = {},
): SdkworkAppbaseBackendClient {
  return attachClawRouterSdkSessionAuthBoundary(new SdkworkAppbaseBackendClient(buildAppbaseBackendConfig(options)));
}

export function createSdkworkGenerationsAppSdkClient(
  options: SdkworkGenerationsAppSdkClientOptions = {},
): SdkworkGenerationsAppClient {
  return attachClawRouterSdkSessionAuthBoundary(new SdkworkGenerationsAppClient(buildGenerationsAppConfig(options)));
}

export function createSdkworkMemoryAppSdkClient(
  options: SdkworkMemoryAppSdkClientOptions = {},
): SdkworkMemoryAppClient {
  return attachClawRouterSdkSessionAuthBoundary(new SdkworkMemoryAppClient(buildMemoryAppConfig(options)));
}

export function createSdkworkAgentAppSdkClient(
  options: SdkworkAgentAppSdkClientOptions = {},
): SdkworkAgentAppClient {
  return attachClawRouterSdkSessionAuthBoundary(new SdkworkAgentAppClient(buildAgentAppConfig(options)));
}

export function createSdkworkAgentBackendSdkClient(
  options: SdkworkAgentBackendSdkClientOptions = {},
): SdkworkAgentBackendClient {
  return attachClawRouterSdkSessionAuthBoundary(new SdkworkAgentBackendClient(buildAgentBackendConfig(options)));
}

export function createSdkworkPromptsBackendSdkClient(
  options: SdkworkPromptsBackendSdkClientOptions = {},
): SdkworkPromptsBackendClient {
  return attachClawRouterSdkSessionAuthBoundary(createPromptsBackendSdkClient(buildPromptsBackendConfig(options)));
}

export function createSdkworkDriveAppSdkClient(
  options: SdkworkDriveAppSdkClientOptions = {},
): SdkworkDriveAppClient {
  return attachClawRouterSdkSessionAuthBoundary(createDriveAppClient(buildDriveAppConfig(options)));
}

export function createSdkworkCommerceAppSdkClient(
  options: SdkworkCommerceAppSdkClientOptions = {},
): SdkworkCommerceAppClient {
  return attachClawRouterSdkSessionAuthBoundary(new SdkworkCommerceAppClient(buildCommerceAppConfig(options)));
}

export function createSdkworkCommerceBackendSdkClient(
  options: SdkworkCommerceBackendSdkClientOptions = {},
): SdkworkCommerceGeneratedBackendClient {
  return attachClawRouterSdkSessionAuthBoundary(
    new SdkworkCommerceGeneratedBackendClient(buildCommerceBackendConfig(options)),
  );
}

export function createClawRouterAiSdkClient(options: ClawRouterAiSdkClientOptions = {}): SdkworkAiClient {
  return new SdkworkAiClient(buildAiConfig(options));
}

function createClawRouterCommerceService(): SdkworkCommerceService {
  const service = createSdkworkCommerceService({
    appClient: wrapCommerceAppSdkClient(getSdkworkCommerceAppSdkClient()),
    backendClient: wrapCommerceBackendSdkClient(getSdkworkCommerceBackendSdkClient()),
  });
  return attachCommerceServiceAliases(service);
}

function wrapCommerceAppSdkClient(client: SdkworkCommerceAppClient): CommerceAppSdkClient {
  return {
    commerce: createAppCommerceCanonicalFacade(client) as unknown as CommerceAppSdkClient['commerce'],
  };
}

function wrapCommerceBackendSdkClient(client: SdkworkCommerceBackendSdkClient): CommerceBackendSdkClient {
  return {
    commerce: createBackendCommerceCanonicalFacade(
      client as unknown as BackendCommerceDependencyOverlay,
    ) as unknown as CommerceBackendSdkClient['commerce'],
  };
}

export function getClawRouterAppSdkClient(options: ClawRouterAppSdkClientOptions = {}): ClawRouterAppSdkClient {
  if (hasRuntimeOverrides(options)) {
    return createClawRouterAppSdkClient(options);
  }
  const injected = readInjectedAppSdkClient();
  if (injected) {
    return injected;
  }
  if (!appClient) {
    appClient = createClawRouterAppSdkClient();
  }
  return appClient;
}

export function getClawRouterBackendSdkClient(options: ClawRouterBackendSdkClientOptions = {}): ClawRouterBackendSdkClient {
  if (hasRuntimeOverrides(options)) {
    return createClawRouterBackendSdkClient(options);
  }
  const injected = readInjectedBackendSdkClient();
  if (injected) {
    return injected;
  }
  if (!backendClient) {
    backendClient = createClawRouterBackendSdkClient();
  }
  return backendClient;
}

export type ModelsBackendSdkClient = ModelsBackendClient;
export type ModelsBackendSdkClientOptions = ClawRouterBackendSdkClientOptions;

let modelsBackendClient: ModelsBackendSdkClient | null = null;

export function createModelsBackendSdkClient(
  options: ModelsBackendSdkClientOptions = {},
): ModelsBackendSdkClient {
  return attachClawRouterSdkSessionAuthBoundary(new ModelsBackendClient(buildModelsBackendConfig(options)));
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
export type ModelsAppSdkClientOptions = ClawRouterAppSdkClientOptions;

let modelsAppClient: ModelsAppSdkClient | null = null;

export function createModelsAppSdkClient(
  options: ModelsAppSdkClientOptions = {},
): ModelsAppSdkClient {
  return attachClawRouterSdkSessionAuthBoundary(new ModelsAppClient(buildModelsAppConfig(options)));
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
    return injected;
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
    return injected;
  }
  if (!appbaseBackendClient) {
    appbaseBackendClient = createSdkworkAppbaseBackendSdkClient();
  }
  return appbaseBackendClient;
}

export function getSdkworkGenerationsAppSdkClient(
  options: SdkworkGenerationsAppSdkClientOptions = {},
): SdkworkGenerationsAppClient {
  if (hasRuntimeOverrides(options)) {
    return createSdkworkGenerationsAppSdkClient(options);
  }
  const injected = readInjectedGenerationsAppSdkClient();
  if (injected) {
    return injected;
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
    return injected;
  }
  if (!memoryAppClient) {
    memoryAppClient = createSdkworkMemoryAppSdkClient();
  }
  return memoryAppClient;
}

export function getSdkworkAgentAppSdkClient(
  options: SdkworkAgentAppSdkClientOptions = {},
): SdkworkAgentAppSdkClient {
  if (hasRuntimeOverrides(options)) {
    return createSdkworkAgentAppSdkClient(options);
  }
  const injected = readInjectedAgentAppSdkClient();
  if (injected) {
    return injected;
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
    return injected;
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

export type DriveBackendSdkClient = DriveBackendClient;
export type DriveBackendSdkClientOptions = ClawRouterBackendSdkClientOptions;

export function createSdkworkDriveBackendSdkClient(
  options: DriveBackendSdkClientOptions = {},
): DriveBackendSdkClient {
  return attachClawRouterSdkSessionAuthBoundary(new DriveBackendClient(buildDriveBackendConfig(options)));
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
    return injected;
  }
  if (!driveAppClient) {
    driveAppClient = createSdkworkDriveAppSdkClient();
  }
  return driveAppClient;
}

export function getSdkworkCommerceAppSdkClient(
  options: SdkworkCommerceAppSdkClientOptions = {},
): SdkworkCommerceAppClient {
  if (hasRuntimeOverrides(options)) {
    return createSdkworkCommerceAppSdkClient(options);
  }
  const injected = readInjectedCommerceAppSdkClient();
  if (injected) {
    return injected;
  }
  if (!commerceAppClient) {
    commerceAppClient = createSdkworkCommerceAppSdkClient();
  }
  return commerceAppClient;
}

export function getSdkworkCommerceBackendSdkClient(
  options: SdkworkCommerceBackendSdkClientOptions = {},
): SdkworkCommerceGeneratedBackendClient {
  if (hasRuntimeOverrides(options)) {
    return createSdkworkCommerceBackendSdkClient(options);
  }
  const injected = readInjectedCommerceBackendSdkClient();
  if (injected) {
    return injected;
  }
  if (!commerceBackendClient) {
    commerceBackendClient = createSdkworkCommerceBackendSdkClient();
  }
  return commerceBackendClient;
}

export function getClawRouterAiSdkClient(options: ClawRouterAiSdkClientOptions = {}): SdkworkAiClient {
  if (hasRuntimeOverrides(options)) {
    return createClawRouterAiSdkClient(options);
  }
  const injected = readInjectedAiSdkClient();
  if (injected) {
    return injected;
  }
  const clientKey = createOpenGatewayClientKey();
  if (!aiClient || aiClientSessionKey !== clientKey) {
    aiClient = createClawRouterAiSdkClient();
    aiClientSessionKey = clientKey;
  }
  return aiClient;
}

export function resetClawRouterSdkClients(): void {
  resetClawRouterSdkClientCaches();
  syncClawRouterGlobalTokenManagerFromStoredSession();
}

function resetClawRouterSdkClientCaches(): void {
  appClient = null;
  backendClient = null;
  modelsBackendClient = null;
  appbaseAppClient = null;
  appbaseBackendClient = null;
  generationsAppClient = null;
  memoryAppClient = null;
  agentAppClient = null;
  agentBackendClient = null;
  promptsBackendClient = null;
  driveAppClient = null;
  driveBackendClient = null;
  commerceAppClient = null;
  commerceBackendClient = null;
  aiClient = null;
  aiClientSessionKey = undefined;
}

export function getClawRouterGlobalTokenManager(): AuthTokenManager {
  if (!clawRouterGlobalTokenManager) {
    clawRouterGlobalTokenManager = createTokenManager();
  }
  syncTokenManagerFromStoredSession(clawRouterGlobalTokenManager);
  return clawRouterGlobalTokenManager;
}

export function syncClawRouterGlobalTokenManagerFromStoredSession(): void {
  if (clawRouterGlobalTokenManager) {
    syncTokenManagerFromStoredSession(clawRouterGlobalTokenManager);
  }
}

function resolveClawRouterSessionAuthHandlerOptions() {
  return {
    clearSession: () => {
      clearStoredAppSessionToken();
    },
    readCurrentPath: () => readBrowserRequestPath(readBrowserWindow()),
    readEnv: readClawRouterRuntimeEnv,
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
      if (clawRouterSessionAuthRedirectTarget === redirectTo) {
        return;
      }
      clawRouterSessionAuthRedirectTarget = redirectTo;
      location.replace(redirectTo);
    },
    resetClients: () => {
      resetClawRouterSdkClients();
      resetClawRouterIamRuntimeAfterSessionAuthError();
    },
    shouldRedirectOnUnauthorized: (pathname: string) => {
      if (pathname === '/auth' || pathname.startsWith('/auth/')) {
        return false;
      }
      return isProtectedPortalPath(pathname);
    },
  };
}

export function resetClawRouterSdkSessionAuthRedirectState(): void {
  clawRouterSessionAuthRedirectTarget = null;
  resetSdkworkSessionAuthRedirectState();
}

export function isClawRouterSdkSessionAuthError(error: unknown): boolean {
  return isSdkworkSdkSessionAuthError(error);
}

export function handleClawRouterSdkSessionAuthError(error: unknown): boolean {
  return handleSdkworkSessionAuthUnauthorizedError(error, resolveClawRouterSessionAuthHandlerOptions());
}

function attachClawRouterSdkSessionAuthBoundary<TClient extends ClawRouterSdkClientWithHttp>(client: TClient): TClient {
  return attachSdkworkSdkSessionAuthBoundary(client, resolveClawRouterSessionAuthHandlerOptions());
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

function resetClawRouterIamRuntimeAfterSessionAuthError(): void {
  resetClawRouterIamRuntime();
}

function normalizeBrowserLocationPathname(pathname: string | undefined): string {
  const normalized = pathname?.trim();
  if (!normalized) {
    return '/';
  }
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

export function createClawRouterAppSdkModelExample(modelId: string, nodeEnvReference = 'process.env'): string {
  const sdk = MODELS_APP_SDK_REFERENCE_METADATA;
  const apiKeyProperty = 'api' + 'Key';
  return [
    `import { ${sdk.name} } from '${sdk.packageName}';`,
    '',
    `const client = new ${sdk.name}({`,
    `  baseUrl: '${sdk.apiPrefix}',`,
    `  ${apiKeyProperty}: ${nodeEnvReference}.CLAW_API_KEY,`,
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

function buildAppConfig(options: ClawRouterAppSdkClientOptions): SdkworkAppConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.appBaseUrl ?? readClawRouterRuntimeEnv('VITE_CLAWROUTER_APP_API_BASE_URL') ?? APP_API_PREFIX,
      APP_API_PREFIX,
    ),
    platform: options.platform ?? 'web',
    tokenManager: resolveClawRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

function buildBackendConfig(options: ClawRouterBackendSdkClientOptions): SdkworkBackendConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.backendBaseUrl ?? readClawRouterRuntimeEnv('VITE_CLAWROUTER_BACKEND_API_BASE_URL') ?? BACKEND_API_PREFIX,
      BACKEND_API_PREFIX,
    ),
    platform: options.platform ?? 'web-admin',
    tokenManager: resolveClawRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

function buildModelsBackendConfig(options: ModelsBackendSdkClientOptions): SdkworkBackendConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.backendBaseUrl
        ?? readClawRouterRuntimeEnv('VITE_SDKWORK_MODELS_BACKEND_API_BASE_URL')
        ?? readClawRouterRuntimeEnv('VITE_CLAWROUTER_BACKEND_API_BASE_URL')
        ?? BACKEND_API_PREFIX,
      BACKEND_API_PREFIX,
    ),
    platform: options.platform ?? 'web-admin',
    tokenManager: resolveClawRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

function buildModelsAppConfig(options: ModelsAppSdkClientOptions): SdkworkAppConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.appBaseUrl
        ?? readClawRouterRuntimeEnv('VITE_SDKWORK_MODELS_APP_API_BASE_URL')
        ?? readClawRouterRuntimeEnv('VITE_CLAWROUTER_APP_API_BASE_URL')
        ?? APP_API_PREFIX,
      APP_API_PREFIX,
    ),
    platform: options.platform ?? 'web',
    tokenManager: resolveClawRouterSdkTokenManager(options.tokenManager),
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
    tokenManager: resolveClawRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

export function resolveRequiredAppbaseAppBaseUrl(options: SdkworkAppbaseAppSdkClientOptions): string {
  return options.appBaseUrl
    ?? readClawRouterRuntimeEnv('VITE_SDKWORK_APPBASE_APP_API_BASE_URL')
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
    tokenManager: resolveClawRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

export function resolveRequiredAppbaseBackendBaseUrl(options: SdkworkAppbaseBackendSdkClientOptions): string {
  return options.backendBaseUrl
    ?? readClawRouterRuntimeEnv('VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL')
    ?? deriveDependencySurfaceBaseUrl('PORTAL_PUBLIC_SDK_BASE_URL', BACKEND_API_PREFIX)
    ?? BACKEND_API_PREFIX;
}

function buildGenerationsAppConfig(options: SdkworkGenerationsAppSdkClientOptions): SdkworkGenerationsAppConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.appBaseUrl
      ?? readClawRouterRuntimeEnv('VITE_SDKWORK_GENERATIONS_APP_API_BASE_URL')
      ?? readClawRouterRuntimeEnv('VITE_SDKWORK_GENERATIONS_PC_APP_API_BASE_URL')
      ?? readClawRouterRuntimeEnv('VITE_CLAWROUTER_APP_API_BASE_URL')
      ?? APP_API_PREFIX,
      APP_API_PREFIX,
    ),
    platform: options.platform ?? 'web',
    tokenManager: resolveClawRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

function buildMemoryAppConfig(options: SdkworkMemoryAppSdkClientOptions): SdkworkMemoryAppConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.appBaseUrl
      ?? readClawRouterRuntimeEnv('VITE_SDKWORK_MEMORY_APP_API_BASE_URL')
      ?? readClawRouterRuntimeEnv('VITE_CLAWROUTER_APP_API_BASE_URL')
      ?? APP_API_PREFIX,
      APP_API_PREFIX,
    ),
    platform: options.platform ?? 'web',
    tokenManager: resolveClawRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

function buildAgentAppConfig(options: SdkworkAgentAppSdkClientOptions): SdkworkAgentAppConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.appBaseUrl
      ?? readClawRouterRuntimeEnv('VITE_SDKWORK_AGENT_APP_API_BASE_URL')
      ?? readClawRouterRuntimeEnv('VITE_CLAWROUTER_APP_API_BASE_URL')
      ?? APP_API_PREFIX,
      APP_API_PREFIX,
    ),
    platform: options.platform ?? 'web',
    tokenManager: resolveClawRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

function buildAgentBackendConfig(options: SdkworkAgentBackendSdkClientOptions): SdkworkAgentBackendConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.backendBaseUrl
      ?? readClawRouterRuntimeEnv('VITE_SDKWORK_AGENT_BACKEND_API_BASE_URL')
      ?? readClawRouterRuntimeEnv('VITE_CLAWROUTER_BACKEND_API_BASE_URL')
      ?? BACKEND_API_PREFIX,
      BACKEND_API_PREFIX,
    ),
    platform: options.platform ?? 'web',
    tokenManager: resolveClawRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

function buildPromptsBackendConfig(options: SdkworkPromptsBackendSdkClientOptions): SdkworkPromptsBackendConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.backendBaseUrl
      ?? readClawRouterRuntimeEnv('VITE_SDKWORK_PROMPTS_BACKEND_API_BASE_URL')
      ?? readClawRouterRuntimeEnv('VITE_SDKWORK_PROMPTS_API_BASE_URL')
      ?? readClawRouterRuntimeEnv('VITE_CLAWROUTER_BACKEND_API_BASE_URL')
      ?? BACKEND_API_PREFIX,
      BACKEND_API_PREFIX,
    ),
    platform: options.platform ?? 'web-admin',
    tokenManager: resolveClawRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

function buildDriveAppConfig(options: SdkworkDriveAppSdkClientOptions): SdkworkDriveAppConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.appBaseUrl
      ?? readClawRouterRuntimeEnv('VITE_SDKWORK_DRIVE_APP_API_BASE_URL')
      ?? readClawRouterRuntimeEnv('VITE_CLAWROUTER_APP_API_BASE_URL')
      ?? APP_API_PREFIX,
      APP_API_PREFIX,
    ),
    platform: options.platform ?? 'web',
    tokenManager: resolveClawRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

function buildDriveBackendConfig(options: DriveBackendSdkClientOptions): SdkworkBackendConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.backendBaseUrl
      ?? readClawRouterRuntimeEnv('VITE_SDKWORK_DRIVE_BACKEND_API_BASE_URL')
      ?? readClawRouterRuntimeEnv('VITE_CLAWROUTER_BACKEND_API_BASE_URL')
      ?? BACKEND_API_PREFIX,
      BACKEND_API_PREFIX,
    ),
    platform: options.platform ?? 'web-admin',
    tokenManager: resolveClawRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

function buildCommerceAppConfig(options: SdkworkCommerceAppSdkClientOptions): SdkworkCommerceAppConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      resolveRequiredCommerceAppBaseUrl(options),
      APP_API_PREFIX,
    ),
    platform: options.platform ?? 'web',
    tokenManager: resolveClawRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

export function resolveRequiredCommerceAppBaseUrl(options: SdkworkCommerceAppSdkClientOptions): string {
  return options.appBaseUrl
    ?? readClawRouterRuntimeEnv('VITE_SDKWORK_COMMERCE_APP_API_BASE_URL')
    ?? deriveDependencySurfaceBaseUrl('PORTAL_PUBLIC_SDK_BASE_URL', APP_API_PREFIX)
    ?? APP_API_PREFIX;
}

function buildCommerceBackendConfig(
  options: SdkworkCommerceBackendSdkClientOptions,
): SdkworkCommerceBackendConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      resolveRequiredCommerceBackendBaseUrl(options),
      BACKEND_API_PREFIX,
    ),
    platform: options.platform ?? 'web-admin',
    tokenManager: resolveClawRouterSdkTokenManager(options.tokenManager),
    timeout: options.timeout,
  };
}

export function resolveRequiredCommerceBackendBaseUrl(options: SdkworkCommerceBackendSdkClientOptions): string {
  return options.backendBaseUrl
    ?? readClawRouterRuntimeEnv('VITE_SDKWORK_COMMERCE_BACKEND_API_BASE_URL')
    ?? deriveDependencySurfaceBaseUrl('PORTAL_PUBLIC_SDK_BASE_URL', BACKEND_API_PREFIX)
    ?? BACKEND_API_PREFIX;
}

function deriveDependencySurfaceBaseUrl(rootEnvName: string, apiPrefix: string): string | undefined {
  const root = readClawRouterRuntimeEnv(rootEnvName)?.replace(/\/+$/g, '');
  if (!root) {
    return undefined;
  }
  const prefix = apiPrefix.startsWith('/') ? apiPrefix : `/${apiPrefix}`;
  return `${root}${prefix}`;
}

function buildAiConfig(options: ClawRouterAiSdkClientOptions): SdkworkAiConfig {
  return {
    baseUrl: normalizeGeneratedSdkBaseUrl(
      options.aiBaseUrl ?? readClawRouterRuntimeEnv('VITE_CLAWROUTER_OPEN_API_BASE_URL') ?? OPEN_API_PREFIX,
      OPEN_API_PREFIX,
    ),
    apiKey: options.apiKey,
    platform: options.platform ?? 'web-open',
    timeout: options.timeout,
  };
}

function hasRuntimeOverrides(
  options:
    | ClawRouterAppSdkClientOptions
    | ClawRouterBackendSdkClientOptions
    | SdkworkAppbaseAppSdkClientOptions
    | SdkworkAppbaseBackendSdkClientOptions
    | SdkworkGenerationsAppSdkClientOptions
    | SdkworkMemoryAppSdkClientOptions
    | SdkworkAgentAppSdkClientOptions
    | SdkworkAgentBackendSdkClientOptions
    | SdkworkDriveAppSdkClientOptions
    | SdkworkCommerceAppSdkClientOptions
    | SdkworkCommerceBackendSdkClientOptions
    | ClawRouterAiSdkClientOptions,
): boolean {
  return Object.keys(options).length > 0;
}

function resolveClawRouterSdkTokenManager(tokenManager: AuthTokenManager | undefined): AuthTokenManager {
  return tokenManager ?? getClawRouterGlobalTokenManager();
}

function syncTokenManagerFromStoredSession(tokenManager: AuthTokenManager): void {
  const tokens = readStoredAuthTokens();
  if (tokens.authToken || tokens.accessToken || tokens.refreshToken) {
    tokenManager.setTokens(tokens);
    return;
  }
  tokenManager.clearTokens();
}

export function getClawRouterBootstrapAccessToken(): string | undefined {
  return readBootstrapAccessTokenFromProcessEnv();
}

export function prepareClawRouterCredentialEntryTokens(): void {
  const storedSession = loadStoredAppSessionToken();
  if (storedSession?.authToken && storedSession.accessToken) {
    return;
  }

  prepareCredentialEntryTokens(getClawRouterGlobalTokenManager(), readBootstrapAccessTokenFromProcessEnv);
  resetClawRouterSdkClientCaches();
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
    readClawRouterRuntimeEnv('VITE_CLAWROUTER_OPEN_API_BASE_URL') ?? OPEN_API_PREFIX,
    OPEN_API_PREFIX,
  ].join(':');
}

function readInjectedAppSdkClient(): ClawRouterAppSdkClient | undefined {
  return (globalThis as ClawRouterSdkRuntimeHost).__SDKWORK_CLAW_ROUTER_APP_SDK_CLIENT__ ?? undefined;
}

function readInjectedBackendSdkClient(): ClawRouterBackendSdkClient | undefined {
  return (globalThis as ClawRouterSdkRuntimeHost).__SDKWORK_CLAW_ROUTER_BACKEND_SDK_CLIENT__ ?? undefined;
}

function readInjectedAppbaseAppSdkClient(): SdkworkAppbaseAppSdkClient | undefined {
  return (globalThis as ClawRouterSdkRuntimeHost).__SDKWORK_APPBASE_APP_SDK_CLIENT__ ?? undefined;
}

function readInjectedAppbaseBackendSdkClient(): SdkworkAppbaseBackendSdkClient | undefined {
  return (globalThis as ClawRouterSdkRuntimeHost).__SDKWORK_APPBASE_BACKEND_SDK_CLIENT__ ?? undefined;
}

function readInjectedGenerationsAppSdkClient(): SdkworkGenerationsAppSdkClient | undefined {
  return (globalThis as ClawRouterSdkRuntimeHost).__SDKWORK_GENERATIONS_APP_SDK_CLIENT__ ?? undefined;
}

function readInjectedMemoryAppSdkClient(): SdkworkMemoryAppSdkClient | undefined {
  return (globalThis as ClawRouterSdkRuntimeHost).__SDKWORK_MEMORY_APP_SDK_CLIENT__ ?? undefined;
}

function readInjectedAgentAppSdkClient(): SdkworkAgentAppSdkClient | undefined {
  return (globalThis as ClawRouterSdkRuntimeHost).__SDKWORK_AGENT_APP_SDK_CLIENT__ ?? undefined;
}

function readInjectedAgentBackendSdkClient(): SdkworkAgentBackendSdkClient | undefined {
  return (globalThis as ClawRouterSdkRuntimeHost).__SDKWORK_AGENT_BACKEND_SDK_CLIENT__ ?? undefined;
}

function readInjectedDriveAppSdkClient(): SdkworkDriveAppSdkClient | undefined {
  return (globalThis as ClawRouterSdkRuntimeHost).__SDKWORK_DRIVE_APP_SDK_CLIENT__ ?? undefined;
}

function readInjectedCommerceAppSdkClient(): SdkworkCommerceAppSdkClient | undefined {
  return (globalThis as ClawRouterSdkRuntimeHost).__SDKWORK_COMMERCE_APP_SDK_CLIENT__ ?? undefined;
}

function readInjectedCommerceBackendSdkClient(): SdkworkCommerceBackendSdkClient | undefined {
  return (globalThis as ClawRouterSdkRuntimeHost).__SDKWORK_COMMERCE_BACKEND_SDK_CLIENT__ ?? undefined;
}

function readInjectedAiSdkClient(): ClawRouterAiSdkClient | undefined {
  return (globalThis as ClawRouterSdkRuntimeHost).__SDKWORK_CLAW_ROUTER_AI_SDK_CLIENT__ ?? undefined;
}

function attachCommerceAppSdkDependency(
  client: SdkworkAppClient,
  commerceClient: SdkworkCommerceAppClient,
): ClawRouterAppSdkClient {
  return attachReadOnlyProperty(client, 'commerce', commerceClient) as ClawRouterAppSdkClient;
}

function attachCommerceBackendSdkDependency(
  client: SdkworkBackendClient,
  commerceClient: SdkworkCommerceBackendSdkClient,
): ClawRouterBackendSdkClient {
  const facade = createBackendCommerceCanonicalFacade(
    commerceClient as unknown as BackendCommerceDependencyOverlay,
  );
  return attachReadOnlyProperty(client, 'commerce', facade) as ClawRouterBackendSdkClient;
}

function createAppCommerceCanonicalFacade(client: SdkworkCommerceAppClient): SdkworkCommerceAppClient {
  const facade = client as SdkworkCommerceAppClient & Record<string, unknown>;
  const invoices = readCommerceObject(facade.invoices);
  if (invoices) {
    attachNestedCreateAlias(invoices, 'submit', 'submissions');
    attachNestedCreateAlias(invoices, 'cancel', 'cancellations');
  }
  return client;
}

function createBackendCommerceCanonicalFacade(commerce: BackendCommerceDependencyOverlay): BackendCommerceDependencyOverlay {
  const facade = commerce as BackendCommerceDependencyOverlay & Record<string, unknown>;
  attachManagementAlias(facade.catalog.spus, 'list');
  attachManagementAlias(facade.orders, 'list');
  attachManagementAlias(facade.orders, 'retrieve');
  attachManagementAlias(facade.orders.events, 'list');
  attachManagementAlias(facade.refunds, 'list');
  attachManagementAlias(facade.refunds, 'retrieve');
  attachManagementAlias(facade.fulfillments, 'list');
  attachManagementAlias(facade.fulfillments, 'retrieve');
  attachManagementAlias(facade.invoices, 'list');
  attachManagementAlias(facade.invoices, 'retrieve');
  attachManagementAlias(facade.payments.methods, 'list');
  attachManagementAlias(facade.memberships.plans, 'list');
  attachManagementAlias(facade.memberships.packages, 'list');
  attachManagementAlias(facade.memberships.packageGroups, 'list');
  attachManagementAlias(facade.recharges.packages, 'list');
  attachManagementAlias(facade.recharges.settings, 'retrieve');
  attachManagementAlias(facade.recharges.orders, 'list');
  attachManagementAlias(facade.recharges.orders, 'retrieve');
  attachManagementAlias(facade.wallet.accounts, 'list');
  attachManagementAlias(facade.wallet.ledgerEntries, 'list');
  attachManagementAlias(facade.wallet.exchangeRules, 'list');
  attachManagementAlias(facade.wallet.adjustments, 'create');
  const inventory = readCommerceObject(facade.inventory);
  if (inventory && !readCommerceResourceProperty(inventory, 'ledgerEntries')) {
    const movements = readCommerceResourceProperty(inventory, 'movements');
    if (movements) {
      attachReadOnlyProperty(inventory, 'ledgerEntries', movements);
    }
  }
  return commerce;
}

function attachCommerceServiceAliases(service: SdkworkCommerceService): SdkworkCommerceService {
  const admin = service.admin as Record<string, unknown>;
  const inventory = readCommerceObject(admin.inventory);
  const memberships = readCommerceObject(admin.memberships);
  const payments = readCommerceObject(admin.payments);
  const recharges = readCommerceObject(admin.recharges);
  const wallet = readCommerceObject(admin.wallet);
  const invoices = readCommerceObject(admin.invoices);
  const catalog = readCommerceObject(admin.catalog);
  const fulfillments = readCommerceObject(admin.fulfillments);
  const refunds = readCommerceObject(admin.refunds);

  if (inventory && !readCommerceResourceProperty(inventory, 'ledgerEntries')) {
    const movements = readCommerceResourceProperty(inventory, 'movements');
    if (movements) {
      attachReadOnlyProperty(inventory, 'ledgerEntries', movements);
    }
  }

  attachCommerceManagementAliases(readCommerceObject(catalog?.['spus']), ['list']);
  attachCommerceManagementAliases(fulfillments, ['list', 'retrieve']);
  attachCommerceManagementAliases(refunds, ['list', 'retrieve']);
  attachCommerceManagementAliases(readCommerceObject(memberships?.['plans']), ['list']);
  attachCommerceManagementAliases(readCommerceObject(memberships?.['packages']), ['list']);
  attachCommerceManagementAliases(readCommerceObject(memberships?.['packageGroups']), ['list']);
  attachCommerceManagementAliases(readCommerceObject(payments?.['methods']), ['list']);
  attachCommerceManagementAliases(readCommerceObject(recharges?.['packages']), ['list']);
  attachCommerceManagementAliases(readCommerceObject(recharges?.['settings']), ['retrieve']);
  attachCommerceManagementAliases(readCommerceObject(recharges?.['orders']), ['list', 'retrieve']);
  attachCommerceManagementAliases(readCommerceObject(wallet?.['accounts']), ['list']);
  attachCommerceManagementAliases(readCommerceObject(wallet?.['ledgerEntries']), ['list']);
  attachCommerceManagementAliases(readCommerceObject(wallet?.['exchangeRules']), ['list']);
  attachCommerceManagementAliases(readCommerceObject(wallet?.['adjustments']), ['create']);
  attachCommerceManagementAliases(invoices, ['list', 'retrieve']);

  return service;
}

function attachCommerceManagementAliases(
  resource: Record<string, unknown> | undefined,
  methodNames: readonly string[],
): void {
  for (const methodName of methodNames) {
    attachManagementAlias(resource, methodName);
  }
}

function readCommerceObject(value: unknown): Record<string, unknown> | undefined {
  return isCommerceObjectResource(value) ? value as Record<string, unknown> : undefined;
}

function attachManagementAlias(resource: unknown, methodName: string): void {
  if (!isCommerceObjectResource(resource)) {
    return;
  }
  const record = resource as Record<string, unknown>;
  if (typeof record[methodName] === 'function') {
    return;
  }
  const management = record.management;
  if (!isCommerceObjectResource(management)) {
    return;
  }
  const method = (management as Record<string, unknown>)[methodName];
  if (typeof method !== 'function') {
    return;
  }
  attachReadOnlyProperty(record, methodName, method.bind(management));
}

function attachNestedCreateAlias(resource: Record<string, unknown>, methodName: string, nestedResourceName: string): void {
  if (typeof resource[methodName] === 'function') {
    return;
  }
  const nestedResource = resource[nestedResourceName];
  if (!isCommerceObjectResource(nestedResource)) {
    return;
  }
  const create = (nestedResource as Record<string, unknown>).create;
  if (typeof create !== 'function') {
    return;
  }
  attachReadOnlyProperty(resource, methodName, create.bind(nestedResource));
}

function attachReadOnlyProperty<TTarget extends object, TKey extends PropertyKey, TValue>(
  target: TTarget,
  key: TKey,
  value: TValue,
): TTarget & { readonly [K in TKey]: TValue } {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
  });
  return target as TTarget & { readonly [K in TKey]: TValue };
}

function isCommerceObjectResource(value: unknown): value is object {
  return Boolean(value) && typeof value === 'object';
}

function readCommerceResourceProperty(value: object, property: PropertyKey): unknown {
  return (value as Record<PropertyKey, unknown>)[property];
}

subscribeStoredAppSessionChange(() => {
  syncClawRouterGlobalTokenManagerFromStoredSession();
});

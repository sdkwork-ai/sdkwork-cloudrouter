import {
  createSdkworkAppbasePcAuthRuntime,
  type SdkworkAppbasePcAuthRuntimeComposition,
  type SdkworkAppbasePcAuthRuntimeSdkClient,
} from '@sdkwork/auth-runtime-pc-react/appbasePcAuthRuntime';
import {
  type IamRuntime,
} from '@sdkwork/iam-runtime';
import {
  clearStoredAppSessionToken,
  loadStoredAppSessionToken,
  storeAppSessionFromResult,
  toPortalIamBridgeSession,
} from './app-session-token.ts';
import {
  bindCloudRouterIamSessionProjection,
  patchCloudRouterIamContextStore,
} from './iam-runtime-session-projection.ts';
import type { PortalIamBridgeSession } from './portal-session-types.ts';
import {
  APP_API_PREFIX,
  getCloudRouterAppSdkClient,
  getCloudRouterGlobalTokenManager,
  getSdkworkAppbaseAppSdkClient,
  prepareCloudRouterCredentialEntryTokens,
  getSdkworkAccountAppSdkClient,
  getSdkworkCatalogAppSdkClient,
  getSdkworkDriveAppSdkClient,
  getSdkworkGenerationsAppSdkClient,
  getSdkworkMembershipAppSdkClient,
  getSdkworkMemoryAppSdkClient,
  getSdkworkMessagingAppSdkClient,
  getSdkworkPromptsAppSdkClient,
  getSdkworkSkillsAppSdkClient,
  getSdkworkAgentAppSdkClient,
  getSdkworkAssetsAppSdkClient,
  getSdkworkOrderAppSdkClient,
  getSdkworkPaymentAppSdkClient,
  getSdkworkPromotionAppSdkClient,
  resetCloudRouterSdkClients,
} from './sdk-clients.ts';
import { resetCloudRouterMessagingVerificationService } from './messaging-verification-service.ts';
import { normalizeGeneratedSdkBaseUrl } from './sdk-base-url.ts';
import { readCloudRouterRuntimeEnv } from './utils/env.ts';

const CLOUD_ROUTER_IAM_RUNTIME_APP_ID =
  readCloudRouterRuntimeEnv('VITE_SDKWORK_APP_ID')?.trim() || 'sdkwork-cloudrouter';

let runtimeComposition: SdkworkAppbasePcAuthRuntimeComposition | null = null;

export function createCloudRouterIamRuntime(): IamRuntime {
  return createCloudRouterIamRuntimeComposition().runtime;
}

export function createCloudRouterIamRuntimeComposition(): SdkworkAppbasePcAuthRuntimeComposition {
  const tokenManager = getCloudRouterGlobalTokenManager();
  const composition = createSdkworkAppbasePcAuthRuntime({
    app: {
      appId: CLOUD_ROUTER_IAM_RUNTIME_APP_ID,
      deploymentMode: readIamDeploymentMode() ?? 'saas',
      environment: readIamEnvironment() ?? 'dev',
      platform: 'pc',
    },
    baseUrls: {
      appbaseAppApiBaseUrl: resolveAppbaseAppApiBaseUrl(),
    },
    createAppbaseAppClient: getSdkworkAppbaseAppSdkClient,
    credentialEntry: {
      prepareTokens: prepareCloudRouterCredentialEntryTokens,
    },
    hooks: {
      onSessionChanged: () => {
        resetCloudRouterMessagingVerificationService();
        resetCloudRouterSdkClients();
      },
    },
    sdkClients: [
      getCloudRouterAppSdkClient(),
      getSdkworkDriveAppSdkClient(),
      getSdkworkGenerationsAppSdkClient(),
      getSdkworkMemoryAppSdkClient(),
      getSdkworkMessagingAppSdkClient(),
      getSdkworkPromptsAppSdkClient(),
      getSdkworkSkillsAppSdkClient(),
      getSdkworkAgentAppSdkClient(),
      getSdkworkAssetsAppSdkClient(),
      getSdkworkAccountAppSdkClient(),
      getSdkworkCatalogAppSdkClient(),
      getSdkworkMembershipAppSdkClient(),
      getSdkworkOrderAppSdkClient(),
      getSdkworkPaymentAppSdkClient(),
      getSdkworkPromotionAppSdkClient(),
    ] as SdkworkAppbasePcAuthRuntimeSdkClient[],
    sessionBridge: {
      clearSession: clearCloudRouterIamRuntimeSession,
      commitSession: (session) => commitCloudRouterIamRuntimeSession(session),
      readSession: () => toPortalIamBridgeSession(loadStoredAppSessionToken()),
    },
    tokenManager,
  });

  patchCloudRouterIamContextStore(composition.contextStore as import('@sdkwork/iam-runtime').IamContextStore);
  bindCloudRouterIamSessionProjection(composition.runtime);

  return composition;
}

export function getCloudRouterIamRuntime(): IamRuntime {
  if (!runtimeComposition) {
    runtimeComposition = createCloudRouterIamRuntimeComposition();
  }
  return runtimeComposition.runtime;
}

export function resetCloudRouterIamRuntime(): void {
  runtimeComposition = null;
  resetCloudRouterMessagingVerificationService();
}

function clearCloudRouterIamRuntimeSession(): void {
  clearStoredAppSessionToken();
  resetCloudRouterMessagingVerificationService();
  resetCloudRouterSdkClients();
}

function commitCloudRouterIamRuntimeSession(session: unknown): PortalIamBridgeSession | undefined {
  const stored = storeAppSessionFromResult(session);
  resetCloudRouterMessagingVerificationService();
  resetCloudRouterSdkClients();
  return toPortalIamBridgeSession(stored) ?? undefined;
}

function resolveAppbaseAppApiBaseUrl(): string {
  return normalizeGeneratedSdkBaseUrl(
    readCloudRouterRuntimeEnv('VITE_SDKWORK_APPBASE_APP_API_BASE_URL')
    ?? readCloudRouterRuntimeEnv('VITE_CLOUDROUTER_APP_API_BASE_URL')
    ?? APP_API_PREFIX,
    APP_API_PREFIX,
  );
}

function readIamDeploymentMode(): 'local' | 'private' | 'saas' | undefined {
  const value = readCloudRouterRuntimeEnv('VITE_SDKWORK_DEPLOYMENT_MODE')?.trim().toLowerCase();
  return value === 'local' || value === 'private' || value === 'saas' ? value : undefined;
}

function readIamEnvironment(): 'dev' | 'prod' | 'test' | undefined {
  const value = readCloudRouterRuntimeEnv('VITE_SDKWORK_ENVIRONMENT')?.trim().toLowerCase();
  return value === 'dev' || value === 'prod' || value === 'test' ? value : undefined;
}

import { createClient, type SdkworkDocumentsAppClient } from '@sdkwork/documents-app-sdk';
import type { DocumentsAppSdkClient, DocumentsReferenceRuntime } from '@sdkwork/documents-pc-commons';
import {
  APP_API_PREFIX,
  getClawRouterGlobalTokenManager,
  SDK_SYSTEM_CONFIG,
} from './sdk-clients.ts';
import { normalizeGeneratedSdkBaseUrl } from './sdk-base-url.ts';
import { readClawRouterRuntimeEnv, resolveClawRouterRuntimeBoolean } from './utils/env.ts';

let documentsAppSdkClient: SdkworkDocumentsAppClient | null = null;

function resolveDocumentsAppApiBaseUrl(): string {
  return normalizeGeneratedSdkBaseUrl(
    readClawRouterRuntimeEnv('VITE_SDKWORK_DOCUMENTS_APP_API_BASE_URL')
      ?? readClawRouterRuntimeEnv('VITE_CLAWROUTER_APP_API_BASE_URL')
      ?? APP_API_PREFIX,
    APP_API_PREFIX,
  );
}

export function getDocumentsAppSdkClient(): DocumentsAppSdkClient {
  if (!documentsAppSdkClient) {
    documentsAppSdkClient = createClient({
      baseUrl: resolveDocumentsAppApiBaseUrl(),
      tokenManager: getClawRouterGlobalTokenManager(),
    });
  }
  return documentsAppSdkClient as unknown as DocumentsAppSdkClient;
}

export const clawRouterDocumentsReferenceRuntime: DocumentsReferenceRuntime = {
  readRuntimeEnv: readClawRouterRuntimeEnv,
  resolveRuntimeBoolean: resolveClawRouterRuntimeBoolean,
  sdkSystemConfig: SDK_SYSTEM_CONFIG,
  getDocumentsAppSdkClient,
  playgroundUserAgent: 'ClawRouter/1.0.0',
};

import { createClient, type SdkworkDocumentsAppClient } from '@sdkwork/documents-app-sdk';
import type { DocumentsAppSdkClient, DocumentsReferenceRuntime } from '@sdkwork/documents-pc-commons';
import {
  APP_API_PREFIX,
  getCloudRouterGlobalTokenManager,
  SDK_SYSTEM_CONFIG,
} from './sdk-clients.ts';
import { normalizeGeneratedSdkBaseUrl } from './sdk-base-url.ts';
import { readCloudRouterRuntimeEnv, resolveCloudRouterRuntimeBoolean } from './utils/env.ts';

let documentsAppSdkClient: SdkworkDocumentsAppClient | null = null;

function resolveDocumentsAppApiBaseUrl(): string {
  return normalizeGeneratedSdkBaseUrl(
    readCloudRouterRuntimeEnv('VITE_SDKWORK_DOCUMENTS_APP_API_BASE_URL')
      ?? readCloudRouterRuntimeEnv('VITE_CLOUDROUTER_APP_API_BASE_URL')
      ?? APP_API_PREFIX,
    APP_API_PREFIX,
  );
}

export function getDocumentsAppSdkClient(): DocumentsAppSdkClient {
  if (!documentsAppSdkClient) {
    documentsAppSdkClient = createClient({
      baseUrl: resolveDocumentsAppApiBaseUrl(),
      tokenManager: getCloudRouterGlobalTokenManager(),
    });
  }
  return documentsAppSdkClient as unknown as DocumentsAppSdkClient;
}

export const cloudRouterDocumentsReferenceRuntime: DocumentsReferenceRuntime = {
  readRuntimeEnv: readCloudRouterRuntimeEnv,
  resolveRuntimeBoolean: resolveCloudRouterRuntimeBoolean,
  sdkSystemConfig: SDK_SYSTEM_CONFIG,
  getDocumentsAppSdkClient,
  playgroundUserAgent: 'CloudRouter/1.0.0',
};

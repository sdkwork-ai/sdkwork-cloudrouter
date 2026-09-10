import { createClient, type SdkworkDocumentsAppClient } from '@sdkwork/documents-app-sdk';
import type {
  DocumentsAppSdkClient,
  DocumentsGeneratedSdkMetadata,
  DocumentsGeneratedSdkType,
  DocumentsReferenceRuntime,
} from '@sdkwork/documents-pc-commons';
import {
  APP_API_PREFIX,
  getCloudRouterGlobalTokenManager,
  SDK_SYSTEM_CONFIG,
  type CloudRouterGeneratedSdkMetadata,
} from './sdk-clients.ts';
import { normalizeGeneratedSdkBaseUrl, resolveSharedDependencySurfaceBaseUrl } from './sdk-base-url.ts';
import { readCloudRouterRuntimeEnv, resolveCloudRouterRuntimeBoolean } from './utils/env.ts';

let documentsAppSdkClient: SdkworkDocumentsAppClient | null = null;

function resolveDocumentsAppApiBaseUrl(): string {
  return normalizeGeneratedSdkBaseUrl(
    readCloudRouterRuntimeEnv('VITE_SDKWORK_DOCUMENTS_APP_API_BASE_URL')
      ?? readCloudRouterRuntimeEnv('VITE_CLOUDROUTER_APP_API_BASE_URL')
      ?? resolveSharedDependencySurfaceBaseUrl(APP_API_PREFIX)
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

// The documents runtime declares a narrower sdkType union than the Cloud
// Router federation; project only the surfaces it understands so the
// reference runtime never receives an unsupported SDK descriptor.
const DOCUMENTS_SDK_TYPES: readonly DocumentsGeneratedSdkType[] = [
  'app',
  'backend',
  'ai',
  'drive',
  'memory',
  'agent',
  'payment',
  'iaas',
  'paas',
];

function isDocumentsSdkMetadata(
  entry: [string, CloudRouterGeneratedSdkMetadata],
): entry is [string, DocumentsGeneratedSdkMetadata] {
  return (DOCUMENTS_SDK_TYPES as readonly string[]).includes(entry[1].sdkType);
}

const documentsSdkSystemConfig: DocumentsReferenceRuntime['sdkSystemConfig'] =
  Object.fromEntries(
    Object.entries(SDK_SYSTEM_CONFIG).filter(isDocumentsSdkMetadata),
  );

export const cloudRouterDocumentsReferenceRuntime: DocumentsReferenceRuntime = {
  readRuntimeEnv: readCloudRouterRuntimeEnv,
  resolveRuntimeBoolean: resolveCloudRouterRuntimeBoolean,
  sdkSystemConfig: documentsSdkSystemConfig,
  getDocumentsAppSdkClient,
  playgroundUserAgent: 'CloudRouter/1.0.0',
};

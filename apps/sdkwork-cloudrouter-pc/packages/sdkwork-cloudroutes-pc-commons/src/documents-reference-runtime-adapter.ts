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
      headers: {
        'Accept-Language':
          globalThis.document?.documentElement.lang?.trim()
          || globalThis.navigator?.language
          || 'en-US',
      },
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

/**
 * Origin that serves the reference OpenAPI documents when the portal itself is
 * a static bundle (cloud profile).
 *
 * The API Reference/SDK Reference loaders address `/openapi/schema-tabs.json`
 * and the per-surface documents root-relative, which only resolves on the
 * application gateway. In a cross-origin build the page origin is the static
 * portal host, so the gateway origin is supplied as a fallback document origin;
 * without it the loaders degrade to the bundled `/openapi.json` snapshot and
 * only the LLM group renders.
 */
export function resolveReferenceSchemaDocumentOrigins(): string[] {
  try {
    const surfaceBase = resolveSharedDependencySurfaceBaseUrl('/v1')?.trim().replace(/\/+$/g, '');
    if (!surfaceBase) {
      return [];
    }
    const apiPrefix = '/v1';
    if (!surfaceBase.endsWith(apiPrefix)) {
      return [];
    }
    const origin = surfaceBase.slice(0, -apiPrefix.length).replace(/\/+$/g, '');
    return origin && !origin.startsWith('/') ? [origin] : [];
  } catch {
    return [];
  }
}

export const cloudRouterDocumentsReferenceRuntime: DocumentsReferenceRuntime = {
  readRuntimeEnv: readCloudRouterRuntimeEnv,
  resolveRuntimeBoolean: resolveCloudRouterRuntimeBoolean,
  sdkSystemConfig: documentsSdkSystemConfig,
  getDocumentsAppSdkClient,
  playgroundUserAgent: 'CloudRouter/1.0.0',
  schemaDocumentOrigins: resolveReferenceSchemaDocumentOrigins(),
};

import type { SdkworkAppClient } from '@sdkwork/cloudrouter-app-sdk';
import type { SdkworkAppClient as ModelsAppClient } from '@sdkwork/models-app-sdk';

/**
 * Injectable SDK clients for the api-keys capability.
 *
 * The service layer deliberately does NOT import the console client factory
 * (`getCloudRouterAppSdkClient` — it re-exports the
 * `@sdkwork/cloudroutes-pc-commons/runtime` barrel): embedding hosts (the
 * BirdCoder ui-sdkwork-apikey plugin) construct their own generated clients
 * from the host token manager, while the Cloud Router console binds the
 * shared factory at its composition root (`src/App.tsx`). Thunks keep the
 * console's lazy-singleton semantics: the factory runs on first use, not at
 * module evaluation.
 */
export interface ApiKeyServiceClients {
  /** Cloud Router app SDK client (or factory) for the iam/ai domains. */
  appClient: SdkworkAppClient | (() => SdkworkAppClient);
  /**
   * Models app SDK client (or factory) for the model-vendor catalog. When
   * absent, the vendor list falls back to the static vendor table.
   */
  modelsClient?: ModelsAppClient | (() => ModelsAppClient | undefined);
}

let configuredAppClient: ApiKeyServiceClients['appClient'] | undefined;
let configuredModelsClient: ApiKeyServiceClients['modelsClient'] | undefined;

/** Bind the clients (or factories) the service resolves on every call. */
export function configureApiKeyServiceClients(clients: ApiKeyServiceClients): void {
  configuredAppClient = clients.appClient;
  configuredModelsClient = clients.modelsClient;
}

/** Remove the binding (tests / embed teardown). */
export function resetApiKeyServiceClients(): void {
  configuredAppClient = undefined;
  configuredModelsClient = undefined;
}

/** Resolve the app client for one service call. */
export function resolveApiKeyServiceAppClient(): SdkworkAppClient {
  const configured = configuredAppClient;
  if (configured === undefined) {
    throw new Error(
      'ApiKeyService is not configured: call configureApiKeyServiceClients() before use',
    );
  }
  return typeof configured === 'function' ? configured() : configured;
}

/** Resolve the models client for one vendor-catalog call, or undefined. */
export function resolveApiKeyServiceModelsClient(): ModelsAppClient | undefined {
  const configured = configuredModelsClient;
  if (configured === undefined) {
    return undefined;
  }
  return typeof configured === 'function' ? configured() : configured;
}

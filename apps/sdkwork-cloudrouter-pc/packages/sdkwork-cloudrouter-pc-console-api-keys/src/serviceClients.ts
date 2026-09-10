import type { SdkworkAppClient } from '@sdkwork/cloudrouter-app-sdk';
import type { SdkworkAppClient as ModelsAppClient } from '@sdkwork/models-app-sdk';

/**
 * Injectable SDK clients for the api-keys capability.
 *
 * Embedding hosts (the BirdCoder ui-sdkwork-apikey plugin) may construct
 * their own generated clients from the host token manager and bind them via
 * {@link configureApiKeyServiceClients}. When no binding is configured, the
 * service falls back to the Cloud Router console's shared app SDK factory
 * (`getCloudRouterAppSdkClient`, lazy-singleton: the factory runs on first
 * use, not at module evaluation).
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

/** Read the bound app client binding, or undefined when none is configured. */
export function readBoundAppClient(): ApiKeyServiceClients['appClient'] | undefined {
  return configuredAppClient;
}

/** Resolve the models client for one vendor-catalog call, or undefined. */
export function resolveApiKeyServiceModelsClient(): ModelsAppClient | undefined {
  const configured = configuredModelsClient;
  if (configured === undefined) {
    return undefined;
  }
  return typeof configured === 'function' ? configured() : configured;
}

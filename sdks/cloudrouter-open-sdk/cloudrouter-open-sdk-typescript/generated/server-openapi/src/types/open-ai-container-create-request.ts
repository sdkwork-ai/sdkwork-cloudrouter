import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create a container. */
export interface OpenAiContainerCreateRequest {
  /** Container expiration policy. */
  expires_after?: Record<string, ProviderJsonValue>;
  /** File identifiers to attach to the container on creation. */
  file_ids?: string[];
  /** Requested memory limit or container size. */
  memory_limit?: string;
  /** Human-readable container name. */
  name?: string;
  /** Container network policy. */
  network_policy?: Record<string, ProviderJsonValue>;
  /** Skills to load in the container. */
  skills?: Record<string, ProviderJsonValue>[];
}

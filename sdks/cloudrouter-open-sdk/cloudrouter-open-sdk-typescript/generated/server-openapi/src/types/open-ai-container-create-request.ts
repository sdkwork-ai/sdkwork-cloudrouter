import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create a container. */
export interface OpenAiContainerCreateRequest {
  /** File identifiers to attach to the container on creation. */
  file_ids?: string[];
  /** Requested memory limit or container size. */
  memory_limit?: string;
  /** Developer-defined container metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable container name. */
  name?: string;
}

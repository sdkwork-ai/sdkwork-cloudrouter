import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible container object. */
export interface OpenAiContainer {
  /** Unix timestamp in seconds when the container was created. */
  created_at: string;
  /** Unix timestamp in seconds when the container expires. */
  expires_at?: string;
  /** Container identifier. */
  id: string;
  /** Unix timestamp in seconds when the container was last active. */
  last_active_at?: string;
  /** Memory limit or container size selected for tool execution. */
  memory_limit?: string;
  /** Developer-defined container metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable container name. */
  name?: string;
  /** Object type, normally container. */
  object: 'container';
  /** Container lifecycle status. */
  status: string;
}

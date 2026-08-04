import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible thread object. */
export interface OpenAiThread {
  /** Unix timestamp in seconds when the thread was created. */
  created_at: string;
  /** Thread identifier. */
  id: string;
  /** Developer-defined thread metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Object type, normally thread. */
  object: 'thread';
  /** Resources available to assistant tools. */
  tool_resources?: ProviderJsonValue;
}

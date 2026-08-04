import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible assistant object. */
export interface OpenAiAssistant {
  /** Unix timestamp in seconds when the assistant was created. */
  created_at: string;
  /** Assistant description. */
  description?: string;
  /** Assistant identifier. */
  id: string;
  /** Instructions applied by the assistant. */
  instructions?: string;
  /** Developer-defined assistant metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Model id used by the assistant. */
  model: string;
  /** Assistant name. */
  name?: string;
  /** Object type, normally assistant. */
  object: 'assistant';
  /** Assistant response format configuration. */
  response_format?: ProviderJsonValue;
  /** Sampling temperature. */
  temperature?: number;
  /** Resources available to assistant tools. */
  tool_resources?: ProviderJsonValue;
  /** Tool definitions available to the assistant. */
  tools?: ProviderJsonValue[];
  /** Nucleus sampling probability mass. */
  top_p?: number;
}

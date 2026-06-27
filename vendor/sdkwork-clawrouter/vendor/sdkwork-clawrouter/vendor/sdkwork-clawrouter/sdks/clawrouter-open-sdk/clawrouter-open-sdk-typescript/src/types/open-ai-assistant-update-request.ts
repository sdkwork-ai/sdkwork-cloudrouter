import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to update an assistant. */
export interface OpenAiAssistantUpdateRequest {
  /** Assistant description. */
  description?: string;
  /** Instructions applied by the assistant. */
  instructions?: string;
  /** Developer-defined assistant metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Replacement model id used by the assistant. */
  model?: string;
  /** Assistant name. */
  name?: string;
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

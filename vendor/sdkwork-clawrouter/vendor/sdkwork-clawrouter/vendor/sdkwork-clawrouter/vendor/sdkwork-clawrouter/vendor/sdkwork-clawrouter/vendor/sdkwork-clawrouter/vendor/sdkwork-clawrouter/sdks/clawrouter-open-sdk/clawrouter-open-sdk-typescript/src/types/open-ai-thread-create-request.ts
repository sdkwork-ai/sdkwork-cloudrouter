import type { OpenAiThreadMessageCreateRequest } from './open-ai-thread-message-create-request';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create a thread. */
export interface OpenAiThreadCreateRequest {
  /** Initial messages to add to the thread. */
  messages?: OpenAiThreadMessageCreateRequest[];
  /** Developer-defined thread metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Resources available to assistant tools. */
  tool_resources?: ProviderJsonValue;
}

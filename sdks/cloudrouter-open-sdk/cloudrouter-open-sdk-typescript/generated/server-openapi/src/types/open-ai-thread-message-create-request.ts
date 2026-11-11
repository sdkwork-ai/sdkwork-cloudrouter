import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create a thread message. */
export interface OpenAiThreadMessageCreateRequest {
  /** Message file or tool attachments. */
  attachments?: ProviderJsonValue[];
  /** Message content as text or structured content parts. */
  content: ProviderJsonValue;
  /** Developer-defined message metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Message role. */
  role: string;
}

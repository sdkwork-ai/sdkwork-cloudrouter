import type { OpenAiResponseInputItem } from './open-ai-response-input-item';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to count tokens for a Responses API input. */
export interface OpenAiResponseInputTokenCountRequest {
  /** Responses API input to count. */
  input: string | OpenAiResponseInputItem[];
  /** Optional system or developer instructions included in the count. */
  instructions?: string;
  /** Model id or Claw Router catalog key used for token counting. */
  model: string;
  /** Tools included in the count when supported. */
  tools?: ProviderJsonValue[];
}

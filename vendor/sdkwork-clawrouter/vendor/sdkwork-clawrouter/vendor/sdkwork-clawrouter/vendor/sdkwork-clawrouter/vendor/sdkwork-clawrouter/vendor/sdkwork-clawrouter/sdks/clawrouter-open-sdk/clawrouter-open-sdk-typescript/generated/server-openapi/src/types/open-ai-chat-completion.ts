import type { OpenAiChatCompletionChoice } from './open-ai-chat-completion-choice';
import type { OpenAiTokenUsage } from './open-ai-token-usage';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai chat completion schema exposed by Claw Router. */
export interface OpenAiChatCompletion {
  /** Generated chat completion choices. */
  choices: OpenAiChatCompletionChoice[];
  /** Unix timestamp in seconds when the completion was created. */
  created: string;
  /** Chat completion identifier. */
  id: string;
  /** Model id used by the upstream response. */
  model: string;
  /** Object type, normally chat.completion. */
  object: 'chat.completion';
  /** Upstream request identifier when returned. */
  request_id?: string;
  /** Service tier used by the upstream when returned. */
  service_tier?: string;
  /** Backend fingerprint for deterministic debugging when returned. */
  system_fingerprint?: string;
  /** Usage field on the open ai chat completion, using the open ai token usage module. */
  usage?: OpenAiTokenUsage;
}

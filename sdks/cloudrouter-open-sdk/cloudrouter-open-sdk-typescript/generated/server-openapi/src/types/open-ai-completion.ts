import type { CreateCompletionChoice } from './create-completion-choice';
import type { OpenAiTokenUsage } from './open-ai-token-usage';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible legacy text completion response. */
export interface OpenAiCompletion {
  /** Generated completion choices. */
  choices: CreateCompletionChoice[];
  /** Unix timestamp in seconds when the completion was created. */
  created: string;
  /** Completion identifier. */
  id: string;
  /** Model id used by the completion. */
  model: string;
  /** Object type, normally text_completion. */
  object: 'text_completion';
  /** Backend fingerprint used to debug deterministic sampling changes. */
  system_fingerprint?: string;
  /** Usage field on the open ai completion, using the open ai token usage module. */
  usage?: OpenAiTokenUsage;
}

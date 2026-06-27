import type { OpenAiNamedToolChoiceFunction } from './open-ai-named-tool-choice-function';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai named tool choice schema exposed by Claw Router. */
export interface OpenAiNamedToolChoice {
  /** Function field on the open ai named tool choice, using the open ai named tool choice function module. */
  function: OpenAiNamedToolChoiceFunction;
  /** Tool type selected by name. */
  type: 'function';
}

import type { OpenAiFunctionCall } from './open-ai-function-call';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai tool call schema exposed by Claw Router. */
export interface OpenAiToolCall {
  /** Function field on the open ai tool call, using the open ai function call module. */
  function?: OpenAiFunctionCall;
  /** Tool call identifier. */
  id: string;
  /** Tool call type, commonly function. */
  type: 'function';
}

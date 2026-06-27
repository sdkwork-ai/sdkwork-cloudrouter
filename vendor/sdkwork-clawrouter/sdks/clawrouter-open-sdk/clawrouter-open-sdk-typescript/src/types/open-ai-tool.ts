import type { OpenAiFunctionDefinition } from './open-ai-function-definition';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai tool schema exposed by Claw Router. */
export interface OpenAiTool {
  /** Function field on the open ai tool, using the open ai function definition module. */
  function?: OpenAiFunctionDefinition;
  /** Tool type, commonly function. */
  type: 'function';
}

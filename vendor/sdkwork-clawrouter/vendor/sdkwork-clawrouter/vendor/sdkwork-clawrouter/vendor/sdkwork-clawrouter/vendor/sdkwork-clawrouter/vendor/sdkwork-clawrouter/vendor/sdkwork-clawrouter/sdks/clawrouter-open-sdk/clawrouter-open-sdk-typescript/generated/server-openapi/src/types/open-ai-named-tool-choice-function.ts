import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai named tool choice function schema exposed by Claw Router. */
export interface OpenAiNamedToolChoiceFunction {
  /** Function name to force the model to call. */
  name: string;
}

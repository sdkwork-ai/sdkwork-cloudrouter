import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai named function choice schema exposed by Claw Router. */
export interface OpenAiNamedFunctionChoice {
  /** Function name to force the model to call. */
  name: string;
}

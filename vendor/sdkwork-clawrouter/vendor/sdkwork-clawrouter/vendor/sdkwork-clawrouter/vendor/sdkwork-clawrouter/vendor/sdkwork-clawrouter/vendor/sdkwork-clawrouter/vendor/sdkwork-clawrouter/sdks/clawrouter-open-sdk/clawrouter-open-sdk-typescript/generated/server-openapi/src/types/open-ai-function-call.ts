import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai function call schema exposed by Claw Router. */
export interface OpenAiFunctionCall {
  /** JSON-serialized function arguments. */
  arguments: string;
  /** Function name selected by the model. */
  name: string;
}

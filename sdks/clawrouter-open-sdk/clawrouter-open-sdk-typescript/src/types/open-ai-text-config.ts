import type { OpenAiResponseFormat } from './open-ai-response-format';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai text config schema exposed by Claw Router. */
export interface OpenAiTextConfig {
  /** Format field on the open ai text config, using the open ai response format module. */
  format?: OpenAiResponseFormat;
}

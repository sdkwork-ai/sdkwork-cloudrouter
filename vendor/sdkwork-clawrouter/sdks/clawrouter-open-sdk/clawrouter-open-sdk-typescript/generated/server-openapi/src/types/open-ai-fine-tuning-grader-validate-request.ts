import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to validate a fine-tuning grader definition. */
export interface OpenAiFineTuningGraderValidateRequest {
  /** Grader configuration to validate. */
  grader: ProviderJsonValue;
}

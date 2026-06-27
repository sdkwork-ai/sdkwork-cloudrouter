import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible fine-tuning grader validation result. */
export interface OpenAiFineTuningGraderValidationResult {
  /** Validation errors when the grader is invalid. */
  errors?: ProviderJsonValue[];
  /** Whether the grader definition is valid. */
  valid?: boolean;
  /** Validation warnings when returned. */
  warnings?: ProviderJsonValue[];
}

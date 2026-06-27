import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to run a fine-tuning grader against sample input. */
export interface OpenAiFineTuningGraderRunRequest {
  /** Grader configuration to run. */
  grader: ProviderJsonValue;
  /** Sample input used by the grader run. */
  input: ProviderJsonValue;
  /** Model sample output to grade when provided. */
  model_sample?: string;
  /** Reference answer used by the grader when provided. */
  reference_answer?: string;
}

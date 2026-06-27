import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible fine-tuning grader run result. */
export interface OpenAiFineTuningGraderRunResult {
  /** Provider-specific grader details. */
  details?: ProviderJsonValue;
  /** Human-readable grader feedback when returned. */
  feedback?: string;
  /** Whether the grader judged the sample as passing. */
  passed?: boolean;
  /** Numeric grader score when returned. */
  score?: number;
}

import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create a fine-tuning job. */
export interface OpenAiFineTuningJobCreateRequest {
  /** Fine-tuning hyperparameters. */
  hyperparameters?: ProviderJsonValue;
  /** Fine-tuning integrations. */
  integrations?: ProviderJsonValue[];
  /** Developer-defined fine-tuning metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Base model id to fine-tune. */
  model: string;
  /** Best-effort deterministic seed. */
  seed?: string;
  /** Suffix added to the fine-tuned model name. */
  suffix?: string;
  /** Training file identifier. */
  training_file: string;
  /** Validation file identifier. */
  validation_file?: string;
}

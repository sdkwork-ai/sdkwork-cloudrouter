import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai completion tokens details schema exposed by Claw Router. */
export interface OpenAiCompletionTokensDetails {
  /** Prediction tokens accepted by the model. */
  accepted_prediction_tokens?: number;
  /** Number of output audio tokens generated. */
  audio_tokens?: number;
  /** Number of reasoning tokens generated. */
  reasoning_tokens?: number;
  /** Prediction tokens rejected by the model. */
  rejected_prediction_tokens?: number;
}

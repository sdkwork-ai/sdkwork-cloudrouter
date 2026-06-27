import type { GoogleCandidate } from './google-candidate';
import type { GooglePromptFeedback } from './google-prompt-feedback';
import type { GoogleUsageMetadata } from './google-usage-metadata';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google generate content response schema exposed by Claw Router vendor routing. */
export interface GoogleGenerateContentResponse {
  /** Candidate responses returned by Gemini. */
  candidates?: GoogleCandidate[];
  /** Model version that generated the response. */
  modelVersion?: string;
  /** Prompt feedback field on the google generate content response, using the google prompt feedback module. */
  promptFeedback?: GooglePromptFeedback;
  /** Provider response identifier. */
  responseId?: string;
  /** Usage metadata field on the google generate content response, using the google usage metadata module. */
  usageMetadata?: GoogleUsageMetadata;
}

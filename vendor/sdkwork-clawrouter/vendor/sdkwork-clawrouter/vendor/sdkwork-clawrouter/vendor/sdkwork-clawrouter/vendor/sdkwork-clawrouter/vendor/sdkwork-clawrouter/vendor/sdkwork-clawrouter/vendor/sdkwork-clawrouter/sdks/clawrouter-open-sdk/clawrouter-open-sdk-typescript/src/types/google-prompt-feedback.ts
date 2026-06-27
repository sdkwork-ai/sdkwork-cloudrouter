import type { GoogleSafetyRating } from './google-safety-rating';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google prompt feedback schema exposed by Claw Router vendor routing. */
export interface GooglePromptFeedback {
  /** Reason the prompt was blocked. */
  blockReason?: string;
  /** Prompt safety ratings. */
  safetyRatings?: GoogleSafetyRating[];
}

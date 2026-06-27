import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google safety rating schema exposed by Claw Router vendor routing. */
export interface GoogleSafetyRating {
  /** Whether content was blocked. */
  blocked?: boolean;
  /** Safety harm category. */
  category?: string;
  /** Estimated harm probability. */
  probability?: string;
}

import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google safety setting schema exposed by Claw Router vendor routing. */
export interface GoogleSafetySetting {
  /** Safety harm category. */
  category?: string;
  /** Blocking threshold. */
  threshold?: string;
}

import type { GooglePart } from './google-part';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google content schema exposed by Claw Router vendor routing. */
export interface GoogleContent {
  /** Ordered content parts. */
  parts?: GooglePart[];
  /** Content role, such as user or model. */
  role?: string;
}

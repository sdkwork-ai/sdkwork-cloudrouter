import type { GoogleCitationMetadata } from './google-citation-metadata';
import type { GoogleContent } from './google-content';
import type { GoogleSafetyRating } from './google-safety-rating';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google candidate schema exposed by Claw Router vendor routing. */
export interface GoogleCandidate {
  /** Citation metadata field on the google candidate, using the google citation metadata module. */
  citationMetadata?: GoogleCitationMetadata;
  /** Content field on the google candidate, using the google content module. */
  content?: GoogleContent;
  /** Reason generation stopped. */
  finishReason?: string;
  /** Candidate index. */
  index?: number;
  /** Safety ratings for the candidate. */
  safetyRatings?: GoogleSafetyRating[];
  /** Candidate token count when supplied. */
  tokenCount?: number;
}

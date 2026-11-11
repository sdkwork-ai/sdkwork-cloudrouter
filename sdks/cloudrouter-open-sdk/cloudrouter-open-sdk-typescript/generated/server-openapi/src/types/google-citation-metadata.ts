import type { GoogleCitationSource } from './google-citation-source';
import type { ProviderJsonValue } from './provider-json-value';

/** Citation metadata returned by Gemini. */
export interface GoogleCitationMetadata {
  /** Citation sources used by the candidate. */
  citationSources?: GoogleCitationSource[];
}

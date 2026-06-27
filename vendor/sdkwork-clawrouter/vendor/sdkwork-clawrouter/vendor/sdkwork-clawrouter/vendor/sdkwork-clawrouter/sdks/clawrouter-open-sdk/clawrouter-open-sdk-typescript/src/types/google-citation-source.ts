import type { ProviderJsonValue } from './provider-json-value';

/** Single citation source returned by Gemini. */
export interface GoogleCitationSource {
  /** End index of the cited span. */
  endIndex?: number;
  /** Citation license text when returned. */
  license?: string;
  /** Start index of the cited span. */
  startIndex?: number;
  /** Citation URI. */
  uri?: string;
}

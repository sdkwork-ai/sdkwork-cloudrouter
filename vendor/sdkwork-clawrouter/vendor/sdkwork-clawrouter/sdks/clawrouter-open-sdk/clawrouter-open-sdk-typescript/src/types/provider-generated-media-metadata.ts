import type { ProviderJsonValue } from './provider-json-value';

/** Provider-specific metadata for a generated media asset. */
export interface ProviderGeneratedMediaMetadata {
  [key: string]: ProviderJsonValue;
}
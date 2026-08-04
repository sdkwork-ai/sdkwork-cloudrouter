import type { ProviderJsonValue } from './provider-json-value';

/** Caller or provider metadata represented as JSON key-value pairs. */
export interface ProviderMetadata {
  [key: string]: ProviderJsonValue;
}
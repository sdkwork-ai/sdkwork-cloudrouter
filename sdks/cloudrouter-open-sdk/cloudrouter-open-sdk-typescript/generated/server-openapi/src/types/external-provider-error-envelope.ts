import type { ProviderJsonValue } from './provider-json-value';

/** Provider-defined JSON error body preserved by the Cloud Router gateway. */
export interface ExternalProviderErrorEnvelope {
  [key: string]: ProviderJsonValue;
}
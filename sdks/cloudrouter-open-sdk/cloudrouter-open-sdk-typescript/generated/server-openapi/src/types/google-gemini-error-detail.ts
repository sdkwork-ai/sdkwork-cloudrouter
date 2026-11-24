import type { ProviderJsonValue } from './provider-json-value';

/** A structured Google RPC error detail. */
export interface GoogleGeminiErrorDetail {
  [key: string]: ProviderJsonValue;
}
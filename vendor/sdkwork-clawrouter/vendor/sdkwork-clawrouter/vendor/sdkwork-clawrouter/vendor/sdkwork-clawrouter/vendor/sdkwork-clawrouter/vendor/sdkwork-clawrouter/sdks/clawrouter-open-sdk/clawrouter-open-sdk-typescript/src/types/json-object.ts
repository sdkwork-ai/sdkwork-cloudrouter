import type { ProviderJsonValue } from './provider-json-value';

/** Provider-specific JSON payload accepted by Claw Router. */
export interface JsonObject {
  [key: string]: ProviderJsonValue;
}
import type { JsonValue } from './json-value';

/** Storage provider health check response schema exposed by Claw Router. */
export interface StorageProviderHealthCheckResponse {
  [key: string]: JsonValue;
}
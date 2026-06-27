import type { StorageProviderHealthCheckResponse } from './storage-provider-health-check-response';

/** Providers health check create result schema exposed by Claw Router. */
export interface ProvidersHealthCheckCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on providers health check create result. */
  data?: StorageProviderHealthCheckResponse;
  /** Human-readable response message. */
  msg?: string;
}

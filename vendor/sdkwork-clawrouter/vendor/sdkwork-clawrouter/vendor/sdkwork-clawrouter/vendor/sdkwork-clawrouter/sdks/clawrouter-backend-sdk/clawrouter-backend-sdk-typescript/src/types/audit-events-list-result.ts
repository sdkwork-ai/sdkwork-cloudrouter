import type { ServiceProviderCollectionResponse } from './service-provider-collection-response';

/** Audit events list result schema exposed by Claw Router. */
export interface AuditEventsListResult {
  /** Business response code. */
  code: string;
  /** Data field on audit events list result. */
  data?: ServiceProviderCollectionResponse;
  /** Human-readable response message. */
  msg?: string;
}

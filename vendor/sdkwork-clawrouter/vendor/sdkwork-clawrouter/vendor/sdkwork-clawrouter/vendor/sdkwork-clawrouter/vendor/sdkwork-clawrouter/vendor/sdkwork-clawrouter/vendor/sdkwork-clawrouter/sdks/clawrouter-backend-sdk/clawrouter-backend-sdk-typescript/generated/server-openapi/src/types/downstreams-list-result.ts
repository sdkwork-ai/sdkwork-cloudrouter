import type { ServiceProviderCollectionResponse } from './service-provider-collection-response';

/** Downstreams list result schema exposed by Claw Router. */
export interface DownstreamsListResult {
  /** Business response code. */
  code: string;
  /** Data field on downstreams list result. */
  data?: ServiceProviderCollectionResponse;
  /** Human-readable response message. */
  msg?: string;
}

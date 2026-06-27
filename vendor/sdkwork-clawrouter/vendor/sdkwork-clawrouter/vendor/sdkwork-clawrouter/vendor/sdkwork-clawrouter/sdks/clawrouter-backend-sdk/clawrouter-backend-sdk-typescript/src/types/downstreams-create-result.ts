import type { ServiceProviderDownstreamMutationResponse } from './service-provider-downstream-mutation-response';

/** Downstreams create result schema exposed by Claw Router. */
export interface DownstreamsCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on downstreams create result. */
  data?: ServiceProviderDownstreamMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}

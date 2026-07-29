/** App routing request trace schema exposed by Claw Router. */
export interface AppRoutingRequestTrace {
  /** Duration field on app routing request trace. */
  duration: string;
  /** Ended at field on app routing request trace. */
  endedAt: string;
  /** Error message masked field on app routing request trace. */
  errorMessageMasked: string;
  /** Error type field on app routing request trace. */
  errorType: string;
  /** Http method field on app routing request trace. */
  httpMethod: string;
  /** Id field on app routing request trace. */
  id: string;
  /** Model field on app routing request trace. */
  model: string;
  /** Provider error code field on app routing request trace. */
  providerErrorCode: string;
  /** Request bytes field on app routing request trace. */
  requestBytes: string;
  /** Request path field on app routing request trace. */
  requestPath: string;
  /** Request payload hash field on app routing request trace. */
  requestPayloadHash: string;
  /** Response bytes field on app routing request trace. */
  responseBytes: string;
  /** Response payload hash field on app routing request trace. */
  responsePayloadHash: string;
  /** Started at field on app routing request trace. */
  startedAt: string;
  /** Status field on app routing request trace. */
  status: string;
  /** Streaming field on app routing request trace. */
  streaming: boolean;
  /** Time field on app routing request trace. */
  time: string;
  /** Tokens field on app routing request trace. */
  tokens: string;
  /** Trace id field on app routing request trace. */
  traceId: string;
  /** Upstream account code field on app routing request trace. */
  upstreamAccountCode: string;
  /** Upstream account group code field on app routing request trace. */
  upstreamAccountGroupCode: string;
  /** Upstream account group id field on app routing request trace. */
  upstreamAccountGroupId: string;
  /** Upstream account group name field on app routing request trace. */
  upstreamAccountGroupName: string;
  /** Upstream account id field on app routing request trace. */
  upstreamAccountId: string;
  /** Upstream account name field on app routing request trace. */
  upstreamAccountName: string;
}

/** Routing request trace item schema exposed by Claw Router. */
export interface RoutingRequestTraceItem {
  /** Channel field on routing request trace item. */
  channel: string;
  /** Duration field on routing request trace item. */
  duration: string;
  /** Ended at field on routing request trace item. */
  endedAt: string;
  /** Error message masked field on routing request trace item. */
  errorMessageMasked: string;
  /** Error type field on routing request trace item. */
  errorType: string;
  /** Http method field on routing request trace item. */
  httpMethod: string;
  /** Id field on routing request trace item. */
  id: string;
  /** Model field on routing request trace item. */
  model: string;
  /** Provider error code field on routing request trace item. */
  providerErrorCode: string;
  /** Request bytes field on routing request trace item. */
  requestBytes: string;
  /** Request id field on routing request trace item. */
  requestId: string;
  /** Request path field on routing request trace item. */
  requestPath: string;
  /** Request payload hash field on routing request trace item. */
  requestPayloadHash: string;
  /** Response bytes field on routing request trace item. */
  responseBytes: string;
  /** Response payload hash field on routing request trace item. */
  responsePayloadHash: string;
  /** Started at field on routing request trace item. */
  startedAt: string;
  /** Status field on routing request trace item. */
  status: string;
  /** Streaming field on routing request trace item. */
  streaming: boolean;
  /** Time field on routing request trace item. */
  time: string;
  /** Tokens field on routing request trace item. */
  tokens: string;
  /** Trace id field on routing request trace item. */
  traceId: string;
}

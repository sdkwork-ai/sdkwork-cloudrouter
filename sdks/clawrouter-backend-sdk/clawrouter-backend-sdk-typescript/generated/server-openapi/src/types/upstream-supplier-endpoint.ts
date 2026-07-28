/** Upstream supplier endpoint schema exposed by Claw Router. */
export interface UpstreamSupplierEndpoint {
  /** Base url field on upstream supplier endpoint. */
  baseUrl: string;
  /** Endpoint code field on upstream supplier endpoint. */
  endpointCode: string;
  /** Endpoint name field on upstream supplier endpoint. */
  endpointName: string;
  /** Environment field on upstream supplier endpoint. */
  environment: number;
  /** Health status field on upstream supplier endpoint. */
  healthStatus: number;
  /** Id field on upstream supplier endpoint. */
  id: string;
  /** Priority field on upstream supplier endpoint. */
  priority: number;
  /** Protocol code field on upstream supplier endpoint. */
  protocolCode: string | null;
  /** Region code field on upstream supplier endpoint. */
  regionCode: string | null;
  /** Routing weight field on upstream supplier endpoint. */
  routingWeight: number;
  /** Status field on upstream supplier endpoint. */
  status: number;
  /** Timeout ms field on upstream supplier endpoint. */
  timeoutMs: number | null;
}

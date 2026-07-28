/** Upstream supplier endpoint input schema exposed by Claw Router. */
export interface UpstreamSupplierEndpointInput {
  /** Base url field on upstream supplier endpoint input. */
  baseUrl: string;
  /** Endpoint code field on upstream supplier endpoint input. */
  endpointCode: string;
  /** Endpoint name field on upstream supplier endpoint input. */
  endpointName: string;
  /** Environment field on upstream supplier endpoint input. */
  environment?: number | null;
  /** Priority field on upstream supplier endpoint input. */
  priority?: number | null;
  /** Protocol code field on upstream supplier endpoint input. */
  protocolCode?: string | null;
  /** Region code field on upstream supplier endpoint input. */
  regionCode?: string | null;
  /** Routing weight field on upstream supplier endpoint input. */
  routingWeight?: number | null;
  /** Status field on upstream supplier endpoint input. */
  status?: number | null;
  /** Timeout ms field on upstream supplier endpoint input. */
  timeoutMs?: number | null;
}

/** Gateway trace schema exposed by Claw Router. */
export interface GatewayTrace {
  /** HTTP latency display value */
  duration: string;
  /** Endpoint field on gateway trace. */
  endpoint: string;
  /** Id field on gateway trace. */
  id: string;
  /** Masked client IP address. */
  ip: string;
  /** Method field on gateway trace. */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD' | 'CONNECT' | 'TRACE';
  /** Status field on gateway trace. */
  status: number;
  /** Gateway request start time. */
  time: string;
  /** Routed upstream account display name snapshot. */
  upstreamAccount: string;
}

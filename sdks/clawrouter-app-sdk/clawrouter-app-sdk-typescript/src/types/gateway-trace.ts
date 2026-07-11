/** Gateway trace schema exposed by Claw Router. */
export interface GatewayTrace {
  /** Routed channel or gateway node display label. */
  channel: string;
  /** HTTP latency display value, for example 128ms. */
  duration: string;
  /** Requested gateway endpoint path. */
  endpoint: string;
  /** Stable trace identifier displayed to the current user. */
  id: string;
  /** Masked client IP address. */
  ip: string;
  /** Normalized HTTP method. */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
  /** HTTP response status code. */
  status: number;
  /** Request start time in UTC. */
  time: string;
}

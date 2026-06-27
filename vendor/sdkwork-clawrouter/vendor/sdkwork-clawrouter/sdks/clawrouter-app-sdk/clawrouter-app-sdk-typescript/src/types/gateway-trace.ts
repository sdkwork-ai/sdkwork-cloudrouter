/** Gateway trace schema exposed by Claw Router. */
export interface GatewayTrace {
  /** Channel field on gateway trace. */
  channel: string;
  /** HTTP latency display value, for example 128ms. */
  duration: string;
  /** Endpoint field on gateway trace. */
  endpoint: string;
  /** Id field on gateway trace. */
  id: string;
  /** Masked client IP address. */
  ip: string;
  /** Method field on gateway trace. */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
  /** Status field on gateway trace. */
  status: number;
  /** Time field on gateway trace. */
  time: string;
}

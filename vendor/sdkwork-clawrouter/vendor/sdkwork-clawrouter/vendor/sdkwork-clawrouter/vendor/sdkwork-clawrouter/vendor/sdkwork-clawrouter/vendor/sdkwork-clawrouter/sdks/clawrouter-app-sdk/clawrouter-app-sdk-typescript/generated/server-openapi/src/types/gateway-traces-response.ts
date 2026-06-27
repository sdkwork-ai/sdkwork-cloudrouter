import type { GatewayTrace } from './gateway-trace';

/** Gateway traces response schema exposed by Claw Router. */
export interface GatewayTracesResponse {
  /** Items field on gateway traces response. */
  items: GatewayTrace[];
}

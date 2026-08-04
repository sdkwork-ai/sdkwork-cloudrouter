import type { GatewayTrace } from './gateway-trace';
import type { PageInfo } from './page-info';

/** Gateway traces page schema exposed by Cloud Router. */
export interface GatewayTracesPage {
  /** Items field on gateway traces page. */
  items: GatewayTrace[];
  /** Page info field on gateway traces page. */
  pageInfo: PageInfo;
}

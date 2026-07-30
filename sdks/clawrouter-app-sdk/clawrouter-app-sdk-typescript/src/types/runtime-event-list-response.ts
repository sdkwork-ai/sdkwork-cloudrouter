import type { PageInfo } from './page-info';
import type { RuntimeEventItem } from './runtime-event-item';

/** Runtime event list response schema exposed by Claw Router. */
export interface RuntimeEventListResponse {
  /** Items field on runtime event list response. */
  items: RuntimeEventItem[];
  /** Page info field on runtime event list response. */
  pageInfo: PageInfo;
}

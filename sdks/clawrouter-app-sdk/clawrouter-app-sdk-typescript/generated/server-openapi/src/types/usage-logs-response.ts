import type { PageInfo } from './page-info';
import type { UsageLogItem } from './usage-log-item';

/** Usage logs response schema exposed by Claw Router. */
export interface UsageLogsResponse {
  /** Items field on usage logs response. */
  items: UsageLogItem[];
  /** Page info field on usage logs response. */
  pageInfo: PageInfo;
}

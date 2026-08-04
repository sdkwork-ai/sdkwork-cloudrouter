import type { JsonValue } from './json-value';
import type { PageInfo } from './page-info';

/** MonitorNodePage contract. */
export interface MonitorNodePage {
  /** items field on MonitorNodePage. */
  items: Record<string, JsonValue>[];
  /** Page info field on monitor node page. */
  pageInfo: PageInfo;
}

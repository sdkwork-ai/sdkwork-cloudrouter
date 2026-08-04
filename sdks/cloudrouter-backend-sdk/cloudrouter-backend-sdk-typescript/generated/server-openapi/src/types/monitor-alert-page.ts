import type { JsonValue } from './json-value';
import type { PageInfo } from './page-info';

/** MonitorAlertPage contract. */
export interface MonitorAlertPage {
  /** items field on MonitorAlertPage. */
  items: Record<string, JsonValue>[];
  /** Page info field on monitor alert page. */
  pageInfo: PageInfo;
}

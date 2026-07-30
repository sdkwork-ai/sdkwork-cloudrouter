import type { JsonValue } from './json-value';
import type { PageInfo } from './page-info';

/** MonitorPerformancePage contract. */
export interface MonitorPerformancePage {
  /** items field on MonitorPerformancePage. */
  items: Record<string, JsonValue>[];
  /** Page info field on monitor performance page. */
  pageInfo: PageInfo;
}

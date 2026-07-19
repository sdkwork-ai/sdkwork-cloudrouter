import type { PageInfo } from './page-info';

/** MonitorNodePage contract. */
export interface MonitorNodePage {
  /** items field on MonitorNodePage. */
  items: Record<string, unknown>[];
  /** pageInfo field on MonitorNodePage. */
  pageInfo: PageInfo;
}

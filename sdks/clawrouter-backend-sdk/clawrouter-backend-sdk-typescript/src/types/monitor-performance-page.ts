import type { PageInfo } from './page-info';

/** MonitorPerformancePage contract. */
export interface MonitorPerformancePage {
  /** items field on MonitorPerformancePage. */
  items: Record<string, unknown>[];
  /** pageInfo field on MonitorPerformancePage. */
  pageInfo: PageInfo;
}

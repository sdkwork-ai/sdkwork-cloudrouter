import type { PageInfo } from './page-info';

/** AdminRecordPage contract. */
export interface AdminRecordPage {
  /** items field on AdminRecordPage. */
  items: Record<string, unknown>[];
  /** pageInfo field on AdminRecordPage. */
  pageInfo: PageInfo;
}

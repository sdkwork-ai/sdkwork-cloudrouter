import type { AdminRecordLogItem } from './admin-record-log-item';
import type { PageInfo } from './page-info';

/** Admin record page schema exposed by Claw Router. */
export interface AdminRecordPage {
  /** Items field on admin record page. */
  items: AdminRecordLogItem[];
  /** Page info field on admin record page. */
  pageInfo: PageInfo;
}

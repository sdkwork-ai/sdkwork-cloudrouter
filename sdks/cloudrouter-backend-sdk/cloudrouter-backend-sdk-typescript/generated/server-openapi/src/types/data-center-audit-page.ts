import type { DataCenterAudit } from './data-center-audit';
import type { PageInfo } from './page-info';

/** Data center audit page schema exposed by Cloud Router. */
export interface DataCenterAuditPage {
  /** Items field on data center audit page. */
  items: DataCenterAudit[];
  /** Page info field on data center audit page. */
  pageInfo: PageInfo;
}

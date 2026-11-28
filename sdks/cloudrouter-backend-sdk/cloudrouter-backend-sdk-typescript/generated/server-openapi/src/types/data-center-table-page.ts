import type { DataCenterTable } from './data-center-table';
import type { PageInfo } from './page-info';

/** Data center table page schema exposed by Cloud Router. */
export interface DataCenterTablePage {
  /** Items field on data center table page. */
  items: DataCenterTable[];
  /** Page info field on data center table page. */
  pageInfo: PageInfo;
}

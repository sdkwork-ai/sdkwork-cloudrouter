import type { DataCenterExport } from './data-center-export';
import type { PageInfo } from './page-info';

/** Data center export page schema exposed by Cloud Router. */
export interface DataCenterExportPage {
  /** Items field on data center export page. */
  items: DataCenterExport[];
  /** Page info field on data center export page. */
  pageInfo: PageInfo;
}

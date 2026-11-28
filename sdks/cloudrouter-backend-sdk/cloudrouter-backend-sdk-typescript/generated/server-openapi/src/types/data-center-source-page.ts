import type { DataCenterSource } from './data-center-source';
import type { PageInfo } from './page-info';

/** Data center source page schema exposed by Cloud Router. */
export interface DataCenterSourcePage {
  /** Items field on data center source page. */
  items: DataCenterSource[];
  /** Page info field on data center source page. */
  pageInfo: PageInfo;
}

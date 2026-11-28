import type { AiCollectionCategory } from './ai-collection-category';
import type { PageInfo } from './page-info';

/** One page of collection categories, each carrying the number of collections filed under it. */
export interface AiCollectionCategoryPage {
  /** Collection categories of the workspace, including the read-only system categories. */
  items: AiCollectionCategory[];
  /** Page info field on ai collection category page. */
  pageInfo: PageInfo;
}

import type { AiCollection } from './ai-collection';
import type { PageInfo } from './page-info';

/** One page of capability collections. Every collection carries its ordered capability items so the admin editor never needs a second read to open a collection. */
export interface AiCollectionPage {
  /** Capability collections in the workspace. */
  items: AiCollection[];
  /** Page info field on ai collection page. */
  pageInfo: PageInfo;
}

import type { AiCollectionRelease } from './ai-collection-release';
import type { PageInfo } from './page-info';

/** One page of immutable publish releases for a collection, newest first. */
export interface AiCollectionReleasePage {
  /** Publish releases of the collection. */
  items: AiCollectionRelease[];
  /** Page info field on ai collection release page. */
  pageInfo: PageInfo;
}

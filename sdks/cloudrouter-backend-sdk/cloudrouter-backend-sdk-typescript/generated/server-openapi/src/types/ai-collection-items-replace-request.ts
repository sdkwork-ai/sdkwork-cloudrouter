import type { AiCollectionItemInput } from './ai-collection-item-input';

/** Ai collection items replace request schema exposed by Cloud Router. */
export interface AiCollectionItemsReplaceRequest {
  /** Items field on ai collection items replace request. */
  items: AiCollectionItemInput[];
}

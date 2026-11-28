import type { AiCollectionItemInput } from './ai-collection-item-input';

/** Ai collection create request schema exposed by Cloud Router. */
export interface AiCollectionCreateRequest {
  /** Category id field on ai collection create request. */
  categoryId?: string | null;
  /** Collection key field on ai collection create request. */
  collectionKey?: string | null;
  /** Collection kind field on ai collection create request. */
  collectionKind: 'mixed' | 'skill' | 'mcp' | 'agent' | 'plugin';
  /** Description field on ai collection create request. */
  description?: string | null;
  /** Featured field on ai collection create request. */
  featured?: boolean | null;
  /** Icon ref field on ai collection create request. */
  iconRef?: string | null;
  /** Items field on ai collection create request. */
  items?: AiCollectionItemInput[] | null;
  /** Name field on ai collection create request. */
  name: string;
  /** Sort order field on ai collection create request. */
  sortOrder?: number | null;
  /** Summary field on ai collection create request. */
  summary?: string | null;
  /** Tags field on ai collection create request. */
  tags?: string[] | null;
  /** Visibility field on ai collection create request. */
  visibility?: 'private' | 'organization' | 'public' | null;
}

import type { AiCollectionCapabilityCounts } from './ai-collection-capability-counts';
import type { AiCollectionItem } from './ai-collection-item';

/** Ai collection schema exposed by Cloud Router. */
export interface AiCollection {
  /** Capability counts field on ai collection. */
  capabilityCounts: AiCollectionCapabilityCounts;
  /** Category id field on ai collection. */
  categoryId: string | null;
  /** Category name field on ai collection. */
  categoryName: string | null;
  /** Collection key field on ai collection. */
  collectionKey: string;
  /** Collection kind field on ai collection. */
  collectionKind: 'mixed' | 'skill' | 'mcp' | 'agent' | 'plugin';
  /** Created at field on ai collection. */
  createdAt: string;
  /** Created by field on ai collection. */
  createdBy: string;
  /** Description field on ai collection. */
  description: string;
  /** Featured field on ai collection. */
  featured: boolean;
  /** Icon ref field on ai collection. */
  iconRef: string;
  /** Collection identifier; an int64 decimal string on the wire. */
  id: string;
  /** Item count field on ai collection. */
  itemCount: string;
  /** Ordered capability items of the collection. */
  items: AiCollectionItem[];
  /** Latest release no field on ai collection. */
  latestReleaseNo: number | null;
  /** Name field on ai collection. */
  name: string;
  /** Owner user id field on ai collection. */
  ownerUserId: string;
  /** Publish status field on ai collection. */
  publishStatus: 'draft' | 'published' | 'archived';
  /** Published at field on ai collection. */
  publishedAt: string | null;
  /** Sort order field on ai collection. */
  sortOrder: number;
  /** Status field on ai collection. */
  status: 'enabled' | 'disabled';
  /** Summary field on ai collection. */
  summary: string;
  /** Tags field on ai collection. */
  tags: string[];
  /** Updated at field on ai collection. */
  updatedAt: string;
  /** Updated by field on ai collection. */
  updatedBy: string;
  /** Visibility field on ai collection. */
  visibility: 'private' | 'organization' | 'public';
}

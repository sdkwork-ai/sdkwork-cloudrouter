/** Ai collection category schema exposed by Cloud Router. */
export interface AiCollectionCategory {
  /** Category code field on ai collection category. */
  categoryCode: string;
  /** Number of collections filed under this category in the workspace. */
  collectionCount: string;
  /** Collection kind field on ai collection category. */
  collectionKind: 'mixed' | 'skill' | 'mcp' | 'agent' | 'plugin';
  /** Created at field on ai collection category. */
  createdAt: string;
  /** Description field on ai collection category. */
  description: string;
  /** Icon ref field on ai collection category. */
  iconRef: string;
  /** Category identifier; an int64 decimal string on the wire. */
  id: string;
  /** True for the built-in category set created by the initialize command; system categories cannot be renamed or deleted. */
  isSystem: boolean;
  /** Name field on ai collection category. */
  name: string;
  /** Parent id field on ai collection category. */
  parentId: string | null;
  /** Sort order field on ai collection category. */
  sortOrder: number;
  /** Status field on ai collection category. */
  status: 'enabled' | 'disabled';
  /** Updated at field on ai collection category. */
  updatedAt: string;
}

/** Ai collection category create request schema exposed by Cloud Router. */
export interface AiCollectionCategoryCreateRequest {
  /** Category code field on ai collection category create request. */
  categoryCode: string;
  /** Collection kind field on ai collection category create request. */
  collectionKind: 'mixed' | 'skill' | 'mcp' | 'agent' | 'plugin';
  /** Description field on ai collection category create request. */
  description?: string | null;
  /** Icon ref field on ai collection category create request. */
  iconRef?: string | null;
  /** Name field on ai collection category create request. */
  name: string;
  /** Parent id field on ai collection category create request. */
  parentId?: string | null;
  /** Sort order field on ai collection category create request. */
  sortOrder?: number | null;
  /** Status field on ai collection category create request. */
  status?: 'enabled' | 'disabled' | null;
}

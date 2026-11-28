/** Ai collection category update request schema exposed by Cloud Router. */
export interface AiCollectionCategoryUpdateRequest {
  /** Description field on ai collection category update request. */
  description?: string | null;
  /** Icon ref field on ai collection category update request. */
  iconRef?: string | null;
  /** Name field on ai collection category update request. */
  name?: string | null;
  /** Parent id field on ai collection category update request. */
  parentId?: string | null;
  /** Sort order field on ai collection category update request. */
  sortOrder?: number | null;
  /** Status field on ai collection category update request. */
  status?: 'enabled' | 'disabled' | null;
}

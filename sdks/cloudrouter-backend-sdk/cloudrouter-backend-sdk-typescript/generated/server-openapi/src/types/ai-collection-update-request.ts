/** Ai collection update request schema exposed by Cloud Router. */
export interface AiCollectionUpdateRequest {
  /** Category id field on ai collection update request. */
  categoryId?: string | null;
  /** Description field on ai collection update request. */
  description?: string | null;
  /** Featured field on ai collection update request. */
  featured?: boolean | null;
  /** Icon ref field on ai collection update request. */
  iconRef?: string | null;
  /** Name field on ai collection update request. */
  name?: string | null;
  /** Sort order field on ai collection update request. */
  sortOrder?: number | null;
  /** Status field on ai collection update request. */
  status?: 'enabled' | 'disabled' | null;
  /** Summary field on ai collection update request. */
  summary?: string | null;
  /** Tags field on ai collection update request. */
  tags?: string[] | null;
  /** Visibility field on ai collection update request. */
  visibility?: 'private' | 'organization' | 'public' | null;
}

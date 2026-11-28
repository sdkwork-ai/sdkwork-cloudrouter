/** Ai collection status update request schema exposed by Cloud Router. */
export interface AiCollectionStatusUpdateRequest {
  /** Notes field on ai collection status update request. */
  notes?: string | null;
  /** Publish status field on ai collection status update request. */
  publishStatus: 'published' | 'archived';
}

/** Ai collection release schema exposed by Cloud Router. */
export interface AiCollectionRelease {
  /** Created at field on ai collection release. */
  createdAt: string;
  /** Id field on ai collection release. */
  id: string;
  /** Item count field on ai collection release. */
  itemCount: string;
  /** Name field on ai collection release. */
  name: string;
  /** Notes field on ai collection release. */
  notes: string;
  /** Published at field on ai collection release. */
  publishedAt: string;
  /** Published by field on ai collection release. */
  publishedBy: string;
  /** Release no field on ai collection release. */
  releaseNo: number;
  /** Release status field on ai collection release. */
  releaseStatus: 'published' | 'revoked';
}

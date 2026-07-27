/** Admin storage reconciliation create request schema exposed by Claw Router. */
export interface AdminStorageReconciliationCreateRequest {
  /** Bucket id field on admin storage reconciliation create request. */
  bucketId?: string | null;
  /** Dry run field on admin storage reconciliation create request. */
  dryRun?: boolean | null;
  /** Provider id field on admin storage reconciliation create request. */
  providerId?: string | null;
  /** Reason field on admin storage reconciliation create request. */
  reason?: string | null;
  /** Run type field on admin storage reconciliation create request. */
  runType?: string | null;
}

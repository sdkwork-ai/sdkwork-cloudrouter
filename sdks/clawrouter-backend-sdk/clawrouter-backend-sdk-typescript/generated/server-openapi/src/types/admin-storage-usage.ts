/** Admin storage usage schema exposed by Claw Router. */
export interface AdminStorageUsage {
  /** File count field on admin storage usage. */
  fileCount: string;
  /** Id field on admin storage usage. */
  id: string;
  /** Reserved bytes field on admin storage usage. */
  reservedBytes: string;
  /** Scope field on admin storage usage. */
  scope: string;
  /** Scope id field on admin storage usage. */
  scopeId: string;
  /** Scope type field on admin storage usage. */
  scopeType: string;
  /** Snapshot at field on admin storage usage. */
  snapshotAt: string;
  /** Used bytes field on admin storage usage. */
  usedBytes: string;
}

/** Admin storage quota policy schema exposed by Claw Router. */
export interface AdminStorageQuotaPolicy {
  /** Created at field on admin storage quota policy. */
  createdAt: string;
  /** Enforcement field on admin storage quota policy. */
  enforcement: string;
  /** Id field on admin storage quota policy. */
  id: string;
  /** Quota limit bytes field on admin storage quota policy. */
  quotaLimitBytes: string;
  /** Scope id field on admin storage quota policy. */
  scopeId: string;
  /** Scope type field on admin storage quota policy. */
  scopeType: string;
  /** Single file limit bytes field on admin storage quota policy. */
  singleFileLimitBytes: string;
  /** Status field on admin storage quota policy. */
  status: string;
  /** Updated at field on admin storage quota policy. */
  updatedAt: string;
  /** Used bytes field on admin storage quota policy. */
  usedBytes: string;
}

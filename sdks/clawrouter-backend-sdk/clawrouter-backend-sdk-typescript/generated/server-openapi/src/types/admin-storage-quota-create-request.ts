/** Admin storage quota create request schema exposed by Claw Router. */
export interface AdminStorageQuotaCreateRequest {
  /** Enforcement field on admin storage quota create request. */
  enforcement?: string | null;
  /** Quota limit bytes field on admin storage quota create request. */
  quotaLimitBytes: string;
  /** Scope id field on admin storage quota create request. */
  scopeId: string;
  /** Scope type field on admin storage quota create request. */
  scopeType: 'app' | 'organization' | 'space' | 'tenant' | 'user';
  /** Single file limit bytes field on admin storage quota create request. */
  singleFileLimitBytes?: string | null;
}

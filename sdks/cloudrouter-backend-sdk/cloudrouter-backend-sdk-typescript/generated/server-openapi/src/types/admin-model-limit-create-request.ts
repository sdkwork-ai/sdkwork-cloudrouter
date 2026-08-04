/** AdminModelLimitCreateRequest contract. */
export interface AdminModelLimitCreateRequest {
  /** Upstream account group code for the model rate limit. */
  accountGroup: string;
  /** model field on AdminModelLimitCreateRequest. */
  model: string;
  /** rpm field on AdminModelLimitCreateRequest. */
  rpm: number;
  /** tpm field on AdminModelLimitCreateRequest. */
  tpm: string;
}

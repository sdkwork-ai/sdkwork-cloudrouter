/** Admin token limit create request schema exposed by Claw Router. */
export interface AdminTokenLimitCreateRequest {
  /** Allowed short-term burst capacity. */
  burst: number;
  /** Masked API key prefix or gateway key selector. */
  keyPrefix: string;
  /** Maximum requests per day for the API key. */
  rpd: number;
  /** Maximum requests per second for the API key. */
  rps: number;
  /** Status field on admin token limit create request. */
  status?: 'active' | 'exhausted';
  /** User identifier or display name attached to the token limit rule. */
  user: string;
}

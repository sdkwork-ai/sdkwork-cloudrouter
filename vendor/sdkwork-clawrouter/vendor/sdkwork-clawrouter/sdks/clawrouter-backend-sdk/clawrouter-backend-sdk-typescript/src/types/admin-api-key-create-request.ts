/** Admin api key create request schema exposed by Claw Router. */
export interface AdminApiKeyCreateRequest {
  /** Human-readable API key name. */
  name: string;
  /** User identifier that owns the API key. */
  userId: string;
}

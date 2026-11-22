/** OpenAI-compatible open ai model group schema exposed by Cloud Router. */
export interface OpenAiModelGroup {
  /** Stable account group code. */
  code: string;
  /** Whether this is the group the model routes through when the caller sends no account-group override. */
  defaultForModel: boolean;
  /** Numeric account group id as a string (wire int64 contract). */
  id: string;
  /** Display name of the account group. */
  name: string;
}

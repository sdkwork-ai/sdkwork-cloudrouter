import type { AdminPromptVersionMutationResponse } from './admin-prompt-version-mutation-response';

/** Versions create result schema exposed by Claw Router. */
export interface VersionsCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on versions create result. */
  data?: AdminPromptVersionMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}

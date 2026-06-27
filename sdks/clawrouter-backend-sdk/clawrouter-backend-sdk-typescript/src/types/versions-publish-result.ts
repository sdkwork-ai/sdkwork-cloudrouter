import type { AdminPromptVersionMutationResponse } from './admin-prompt-version-mutation-response';

/** Versions publish result schema exposed by Claw Router. */
export interface VersionsPublishResult {
  /** Business response code. */
  code: string;
  /** Data field on versions publish result. */
  data?: AdminPromptVersionMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}

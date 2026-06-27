import type { AdminPromptVersionListResponse } from './admin-prompt-version-list-response';

/** Versions list result schema exposed by Claw Router. */
export interface VersionsListResult {
  /** Business response code. */
  code: string;
  /** Data field on versions list result. */
  data?: AdminPromptVersionListResponse;
  /** Human-readable response message. */
  msg?: string;
}

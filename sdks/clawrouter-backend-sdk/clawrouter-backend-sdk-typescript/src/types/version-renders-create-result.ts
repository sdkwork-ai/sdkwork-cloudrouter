import type { AdminPromptRenderResponse } from './admin-prompt-render-response';

/** Version renders create result schema exposed by Claw Router. */
export interface VersionRendersCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on version renders create result. */
  data?: AdminPromptRenderResponse;
  /** Human-readable response message. */
  msg?: string;
}

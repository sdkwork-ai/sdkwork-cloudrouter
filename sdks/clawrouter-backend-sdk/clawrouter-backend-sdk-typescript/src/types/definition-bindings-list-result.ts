import type { AdminPromptBindingListResponse } from './admin-prompt-binding-list-response';

/** Definition bindings list result schema exposed by Claw Router. */
export interface DefinitionBindingsListResult {
  /** Business response code. */
  code: string;
  /** Data field on definition bindings list result. */
  data?: AdminPromptBindingListResponse;
  /** Human-readable response message. */
  msg?: string;
}

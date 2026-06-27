import type { AdminPromptBindingMutationResponse } from './admin-prompt-binding-mutation-response';

/** Definition bindings update result schema exposed by Claw Router. */
export interface DefinitionBindingsUpdateResult {
  /** Business response code. */
  code: string;
  /** Data field on definition bindings update result. */
  data?: AdminPromptBindingMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}

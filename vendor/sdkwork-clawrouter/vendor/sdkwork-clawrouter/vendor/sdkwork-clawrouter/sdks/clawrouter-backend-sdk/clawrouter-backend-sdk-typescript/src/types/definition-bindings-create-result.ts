import type { AdminPromptBindingMutationResponse } from './admin-prompt-binding-mutation-response';

/** Definition bindings create result schema exposed by Claw Router. */
export interface DefinitionBindingsCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on definition bindings create result. */
  data?: AdminPromptBindingMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}

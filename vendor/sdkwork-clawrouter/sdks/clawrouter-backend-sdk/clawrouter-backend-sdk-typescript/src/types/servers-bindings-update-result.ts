import type { AdminMcpBindingMutationResponse } from './admin-mcp-binding-mutation-response';

/** Servers bindings update result schema exposed by Claw Router. */
export interface ServersBindingsUpdateResult {
  /** Business response code. */
  code: string;
  /** Data field on servers bindings update result. */
  data?: AdminMcpBindingMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}

import type { AdminMcpBindingMutationResponse } from './admin-mcp-binding-mutation-response';

/** Servers bindings create result schema exposed by Claw Router. */
export interface ServersBindingsCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on servers bindings create result. */
  data?: AdminMcpBindingMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}

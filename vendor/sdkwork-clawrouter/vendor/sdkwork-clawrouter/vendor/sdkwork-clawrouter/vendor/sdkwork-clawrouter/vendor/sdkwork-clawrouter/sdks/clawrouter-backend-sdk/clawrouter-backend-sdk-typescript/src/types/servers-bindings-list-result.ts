import type { AdminMcpBindingListResponse } from './admin-mcp-binding-list-response';

/** Servers bindings list result schema exposed by Claw Router. */
export interface ServersBindingsListResult {
  /** Business response code. */
  code: string;
  /** Data field on servers bindings list result. */
  data?: AdminMcpBindingListResponse;
  /** Human-readable response message. */
  msg?: string;
}

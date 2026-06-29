import type { ServersBindingsCreateResult } from './servers-bindings-create-result';

export interface ServersBindingsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}

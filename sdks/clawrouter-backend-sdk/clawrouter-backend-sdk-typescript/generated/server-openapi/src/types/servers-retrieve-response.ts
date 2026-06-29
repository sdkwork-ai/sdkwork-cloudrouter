import type { ServersRetrieveResult } from './servers-retrieve-result';

export interface ServersRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}

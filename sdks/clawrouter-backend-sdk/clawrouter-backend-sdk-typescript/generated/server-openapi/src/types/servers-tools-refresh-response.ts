import type { ServersToolsRefreshResult } from './servers-tools-refresh-result';

export interface ServersToolsRefreshResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}

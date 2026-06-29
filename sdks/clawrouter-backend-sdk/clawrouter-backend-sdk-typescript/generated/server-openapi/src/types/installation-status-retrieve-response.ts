import type { InstallationStatusRetrieveResult } from './installation-status-retrieve-result';

export interface InstallationStatusRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}

import type { ShopsCurrentApplicationsCreateResult } from './shops-current-applications-create-result';

export interface ShopsCurrentApplicationsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}

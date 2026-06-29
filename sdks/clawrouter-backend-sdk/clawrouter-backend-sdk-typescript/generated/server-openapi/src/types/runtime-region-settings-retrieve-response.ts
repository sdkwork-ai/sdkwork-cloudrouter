import type { RuntimeRegionSettingsRetrieveResult } from './runtime-region-settings-retrieve-result';

export interface RuntimeRegionSettingsRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}

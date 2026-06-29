import type { RuntimeRegionSettingsUpdateResult } from './runtime-region-settings-update-result';

export interface RuntimeRegionSettingsUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}

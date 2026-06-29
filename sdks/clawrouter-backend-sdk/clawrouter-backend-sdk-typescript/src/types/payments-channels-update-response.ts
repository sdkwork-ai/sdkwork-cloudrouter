import type { PaymentsChannelsUpdateResult } from './payments-channels-update-result';

export interface PaymentsChannelsUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}

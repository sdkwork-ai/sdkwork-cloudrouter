import type { PaymentsChannelsCreateResult } from './payments-channels-create-result';

export interface PaymentsChannelsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}

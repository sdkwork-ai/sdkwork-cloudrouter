import type { PaymentsWebhookEventsReplaysCreateResult } from './payments-webhook-events-replays-create-result';

export interface PaymentsWebhookEventsReplaysCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}

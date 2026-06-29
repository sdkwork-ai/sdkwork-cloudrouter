import type { TurnResponsesCreateResult } from './turn-responses-create-result';

export interface TurnResponsesCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}

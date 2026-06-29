import type { ConversationsCreateResult } from './conversations-create-result';

export interface ConversationsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}

import type { ChatTurnCreateResponse } from './chat-turn-create-response';

/** Turns create result schema exposed by Claw Router. */
export interface TurnsCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on turns create result. */
  data?: ChatTurnCreateResponse;
  /** Human-readable response message. */
  msg?: string;
}

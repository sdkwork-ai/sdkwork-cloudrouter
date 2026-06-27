import type { ChatTurnCreateResponse } from './chat-turn-create-response';

/** Turn responses create result schema exposed by Claw Router. */
export interface TurnResponsesCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on turn responses create result. */
  data?: ChatTurnCreateResponse;
  /** Human-readable response message. */
  msg?: string;
}

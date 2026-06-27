import type { ChatMessageItem } from './chat-message-item';
import type { ChatTurnItem } from './chat-turn-item';

/** Chat turn create response schema exposed by Claw Router. */
export interface ChatTurnCreateResponse {
  /** Messages field on chat turn create response. */
  messages: ChatMessageItem[];
  /** Turn field on chat turn create response. */
  turn: ChatTurnItem;
}

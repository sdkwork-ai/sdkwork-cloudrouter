import type { ChatMessageItem } from './chat-message-item';
import type { ChatTurnItem } from './chat-turn-item';

/** Chat turn outcome schema exposed by Claw Router. */
export interface ChatTurnOutcome {
  /** Messages field on chat turn outcome. */
  messages: ChatMessageItem[];
  /** Turn field on chat turn outcome. */
  turn: ChatTurnItem;
}

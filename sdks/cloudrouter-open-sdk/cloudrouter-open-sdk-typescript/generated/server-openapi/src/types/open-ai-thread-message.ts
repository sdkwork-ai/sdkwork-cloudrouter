import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible thread message object. */
export interface OpenAiThreadMessage {
  /** Assistant identifier associated with the message. */
  assistant_id?: string;
  /** Message file or tool attachments. */
  attachments?: ProviderJsonValue[];
  /** Unix timestamp in seconds when the message completed. */
  completed_at?: string;
  /** Message content parts. */
  content: ProviderJsonValue[];
  /** Unix timestamp in seconds when the message was created. */
  created_at: string;
  /** Message identifier. */
  id: string;
  /** Unix timestamp in seconds when the message became incomplete. */
  incomplete_at?: string;
  /** Details explaining why a message is incomplete. */
  incomplete_details?: ProviderJsonValue;
  /** Developer-defined message metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Object type, normally thread.message. */
  object: 'thread.message';
  /** Message role. */
  role: string;
  /** Run identifier associated with the message. */
  run_id?: string;
  /** Message processing status. */
  status?: string;
  /** Thread identifier that owns the message. */
  thread_id: string;
}

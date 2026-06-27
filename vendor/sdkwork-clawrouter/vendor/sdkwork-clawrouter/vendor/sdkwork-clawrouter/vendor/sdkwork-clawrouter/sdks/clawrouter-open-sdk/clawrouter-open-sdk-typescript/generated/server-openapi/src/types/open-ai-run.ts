import type { OpenAiTokenUsage } from './open-ai-token-usage';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible thread run object. */
export interface OpenAiRun {
  /** Assistant identifier used by the run. */
  assistant_id: string;
  /** Unix timestamp in seconds when the run was cancelled. */
  cancelled_at?: string;
  /** Unix timestamp in seconds when the run completed. */
  completed_at?: string;
  /** Unix timestamp in seconds when the run was created. */
  created_at: string;
  /** Unix timestamp in seconds when the run expires. */
  expires_at?: string;
  /** Unix timestamp in seconds when the run failed. */
  failed_at?: string;
  /** Run identifier. */
  id: string;
  /** Instructions applied to the run. */
  instructions?: string;
  /** Last run error returned by the upstream. */
  last_error?: ProviderJsonValue;
  /** Developer-defined run metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Model id used by the run. */
  model?: string;
  /** Object type, normally thread.run. */
  object: 'thread.run';
  /** Action required to continue the run. */
  required_action?: ProviderJsonValue;
  /** Unix timestamp in seconds when the run started. */
  started_at?: string;
  /** Run status. */
  status: string;
  /** Thread identifier used by the run. */
  thread_id: string;
  /** Tool definitions available to the run. */
  tools?: ProviderJsonValue[];
  /** Usage field on the open ai run, using the open ai token usage module. */
  usage?: OpenAiTokenUsage;
}

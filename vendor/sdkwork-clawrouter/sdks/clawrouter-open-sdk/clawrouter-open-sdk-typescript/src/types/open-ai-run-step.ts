import type { OpenAiTokenUsage } from './open-ai-token-usage';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible run step object. */
export interface OpenAiRunStep {
  /** Assistant identifier associated with the run step. */
  assistant_id: string;
  /** Unix timestamp in seconds when the run step was cancelled. */
  cancelled_at?: string;
  /** Unix timestamp in seconds when the run step completed. */
  completed_at?: string;
  /** Unix timestamp in seconds when the run step was created. */
  created_at: string;
  /** Unix timestamp in seconds when the run step expired. */
  expired_at?: string;
  /** Unix timestamp in seconds when the run step failed. */
  failed_at?: string;
  /** Run step identifier. */
  id: string;
  /** Last run step error returned by the upstream. */
  last_error?: ProviderJsonValue;
  /** Developer-defined run step metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Object type, normally thread.run.step. */
  object: 'thread.run.step';
  /** Run identifier associated with the run step. */
  run_id: string;
  /** Run step status. */
  status: string;
  /** Run step detail payload. */
  step_details?: ProviderJsonValue;
  /** Thread identifier associated with the run step. */
  thread_id: string;
  /** Run step type. */
  type: string;
  /** Usage field on the open ai run step, using the open ai token usage module. */
  usage?: OpenAiTokenUsage;
}

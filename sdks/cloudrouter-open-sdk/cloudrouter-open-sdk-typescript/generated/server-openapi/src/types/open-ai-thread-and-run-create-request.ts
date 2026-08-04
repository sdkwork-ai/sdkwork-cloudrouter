import type { OpenAiThreadCreateRequest } from './open-ai-thread-create-request';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create a thread and start a run. */
export interface OpenAiThreadAndRunCreateRequest {
  /** Assistant identifier used by the run. */
  assistant_id: string;
  /** Instructions applied to the run. */
  instructions?: string;
  /** Developer-defined run metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Model override used by the run. */
  model?: string;
  /** Whether to stream run events. */
  stream?: boolean;
  /** Thread field on the open ai thread and run create request, using the open ai thread create request module. */
  thread?: OpenAiThreadCreateRequest;
  /** Tool definitions available to the run. */
  tools?: ProviderJsonValue[];
}

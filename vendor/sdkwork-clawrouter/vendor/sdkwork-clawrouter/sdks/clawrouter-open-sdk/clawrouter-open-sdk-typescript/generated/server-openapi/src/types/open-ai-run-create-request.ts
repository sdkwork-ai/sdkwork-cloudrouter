import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create a thread run. */
export interface OpenAiRunCreateRequest {
  /** Additional instructions appended for this run. */
  additional_instructions?: string;
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
  /** Tool definitions available to the run. */
  tools?: ProviderJsonValue[];
}

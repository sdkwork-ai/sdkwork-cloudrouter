import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to submit tool outputs for a run. */
export interface OpenAiRunSubmitToolOutputsRequest {
  /** Whether to stream run events after submitting tool outputs. */
  stream?: boolean;
  /** Tool outputs submitted to continue the run. */
  tool_outputs: ProviderJsonValue[];
}

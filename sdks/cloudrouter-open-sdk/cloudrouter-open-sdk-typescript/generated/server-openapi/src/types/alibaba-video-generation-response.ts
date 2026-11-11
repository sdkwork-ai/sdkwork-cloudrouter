import type { AlibabaAsyncTask } from './alibaba-async-task';
import type { AlibabaTaskUsage } from './alibaba-task-usage';
import type { ProviderJsonValue } from './provider-json-value';

/** Alibaba DashScope asynchronous video task submission acknowledgement. */
export interface AlibabaVideoGenerationResponse {
  /** DashScope business error code when the submission failed. */
  code?: string;
  /** DashScope business error message when the submission failed. */
  message?: string;
  /** Submitted asynchronous task record. */
  output?: AlibabaAsyncTask;
  /** DashScope request identifier. */
  request_id?: string;
  /** DashScope usage block for the submitted task. */
  usage?: AlibabaTaskUsage;
}

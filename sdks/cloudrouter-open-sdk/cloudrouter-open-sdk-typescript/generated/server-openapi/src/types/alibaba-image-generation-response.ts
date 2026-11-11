import type { AlibabaAsyncTask } from './alibaba-async-task';
import type { AlibabaTaskUsage } from './alibaba-task-usage';
import type { ProviderJsonValue } from './provider-json-value';

/** Alibaba DashScope Wanx image task submission acknowledgement. */
export interface AlibabaImageGenerationResponse {
  /** DashScope business error code when the submission failed. */
  code?: string;
  /** DashScope business error message when the submission failed. */
  message?: string;
  /** Submitted asynchronous task record. */
  output?: AlibabaAsyncTask;
  /** DashScope request identifier. */
  request_id?: string;
  /** DashScope usage block carrying the generated image count. */
  usage?: AlibabaTaskUsage;
}

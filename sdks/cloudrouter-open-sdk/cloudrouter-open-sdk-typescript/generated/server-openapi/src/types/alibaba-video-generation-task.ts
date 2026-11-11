import type { AlibabaAsyncTask } from './alibaba-async-task';
import type { AlibabaTaskUsage } from './alibaba-task-usage';
import type { ProviderJsonValue } from './provider-json-value';

/** Alibaba DashScope asynchronous task status and its generated video. */
export interface AlibabaVideoGenerationTask {
  /** Current asynchronous task record. */
  output?: AlibabaAsyncTask;
  /** DashScope request identifier. */
  request_id?: string;
  /** Usage counters returned once the task succeeds. */
  usage?: AlibabaTaskUsage;
}

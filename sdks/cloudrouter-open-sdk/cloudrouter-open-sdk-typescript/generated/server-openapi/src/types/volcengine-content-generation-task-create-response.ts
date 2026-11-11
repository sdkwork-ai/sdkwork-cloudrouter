import type { ProviderJsonValue } from './provider-json-value';

/** Volcengine Ark video generation task creation response. */
export interface VolcengineContentGenerationTaskCreateResponse {
  /** Created task id; poll `GET /api/v3/contents/generations/tasks/{task_id}` for its result. */
  id?: string;
}

import type { ShopsQualificationsUpsertResult } from './shops-qualifications-upsert-result';

export interface ShopsQualificationsUpsertResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}

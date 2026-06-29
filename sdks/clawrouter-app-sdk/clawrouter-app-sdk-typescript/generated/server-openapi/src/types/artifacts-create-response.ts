import type { ArtifactsCreateResult } from './artifacts-create-result';

export interface ArtifactsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}

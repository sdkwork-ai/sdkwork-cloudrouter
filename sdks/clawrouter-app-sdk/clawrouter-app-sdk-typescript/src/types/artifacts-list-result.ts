import type { RuntimeArtifactListResponse } from './runtime-artifact-list-response';

/** Artifacts list result schema exposed by Claw Router. */
export interface ArtifactsListResult {
  /** Business response code. */
  code: string;
  /** Data field on artifacts list result. */
  data?: RuntimeArtifactListResponse;
  /** Human-readable response message. */
  msg?: string;
}

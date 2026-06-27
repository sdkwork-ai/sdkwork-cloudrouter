import type { RuntimeArtifactResponse } from './runtime-artifact-response';

/** Artifacts create result schema exposed by Claw Router. */
export interface ArtifactsCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on artifacts create result. */
  data?: RuntimeArtifactResponse;
  /** Human-readable response message. */
  msg?: string;
}

import type { RuntimeArtifactItem } from './runtime-artifact-item';

/** Runtime artifact list response schema exposed by Claw Router. */
export interface RuntimeArtifactListResponse {
  /** Items field on runtime artifact list response. */
  items: RuntimeArtifactItem[];
}

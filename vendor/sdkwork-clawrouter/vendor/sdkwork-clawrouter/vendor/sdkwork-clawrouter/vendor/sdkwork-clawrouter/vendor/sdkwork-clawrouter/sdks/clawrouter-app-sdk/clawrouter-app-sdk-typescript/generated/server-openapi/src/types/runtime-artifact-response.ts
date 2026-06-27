import type { RuntimeArtifactItem } from './runtime-artifact-item';

/** Runtime artifact response schema exposed by Claw Router. */
export interface RuntimeArtifactResponse {
  /** Item field on runtime artifact response. */
  item: RuntimeArtifactItem;
}

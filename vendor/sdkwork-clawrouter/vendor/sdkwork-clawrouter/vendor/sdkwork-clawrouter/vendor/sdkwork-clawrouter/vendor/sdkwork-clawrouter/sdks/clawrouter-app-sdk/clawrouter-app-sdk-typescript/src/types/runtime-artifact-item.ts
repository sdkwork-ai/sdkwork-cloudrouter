import type { MediaResource } from './media-resource';

/** Runtime artifact item schema exposed by Claw Router. */
export interface RuntimeArtifactItem {
  /** Artifact type field on runtime artifact item. */
  artifactType: string;
  /** Content text field on runtime artifact item. */
  contentText?: string | null;
  /** Created at field on runtime artifact item. */
  createdAt: string;
  /** Id field on runtime artifact item. */
  id: string;
  /** Invocation id field on runtime artifact item. */
  invocationId: string;
  /** Mime type field on runtime artifact item. */
  mimeType?: string | null;
  /** Name field on runtime artifact item. */
  name?: string | null;
  /** Resource field on runtime artifact item. */
  resource?: MediaResource;
  /** Sha 256 field on runtime artifact item. */
  sha256?: string | null;
  /** Size bytes field on runtime artifact item. */
  sizeBytes?: string | null;
  /** Storage key field on runtime artifact item. */
  storageKey?: string | null;
}

import type { JsonValue } from './json-value';
import type { MediaResource } from './media-resource';

/** Runtime artifact create request schema exposed by Claw Router. */
export interface RuntimeArtifactCreateRequest {
  /** Artifact type field on runtime artifact create request. */
  artifactType: string;
  /** Content json field on runtime artifact create request. */
  contentJson?: Record<string, JsonValue>;
  /** Content text field on runtime artifact create request. */
  contentText?: string;
  /** Metadata field on runtime artifact create request. */
  metadata?: Record<string, JsonValue>;
  /** Mime type field on runtime artifact create request. */
  mimeType?: string;
  /** Name field on runtime artifact create request. */
  name?: string;
  /** Resource field on runtime artifact create request. */
  resource?: MediaResource;
  /** Sha 256 field on runtime artifact create request. */
  sha256?: string;
  /** Size bytes field on runtime artifact create request. */
  sizeBytes?: string;
  /** Storage key field on runtime artifact create request. */
  storageKey?: string;
}

import type { JsonValue } from './json-value';
import type { MediaResource } from './media-resource';

/** Create runtime artifact request schema exposed by Claw Router. */
export interface CreateRuntimeArtifactRequest {
  /** Artifact type field on create runtime artifact request. */
  artifactType: string;
  /** Content json field on create runtime artifact request. */
  contentJson?: Record<string, JsonValue>;
  /** Content text field on create runtime artifact request. */
  contentText?: string;
  /** Metadata field on create runtime artifact request. */
  metadata?: Record<string, JsonValue>;
  /** Mime type field on create runtime artifact request. */
  mimeType?: string;
  /** Name field on create runtime artifact request. */
  name?: string;
  /** Resource field on create runtime artifact request. */
  resource?: MediaResource;
  /** Sha 256 field on create runtime artifact request. */
  sha256?: string;
  /** Size bytes field on create runtime artifact request. */
  sizeBytes?: string;
  /** Storage key field on create runtime artifact request. */
  storageKey?: string;
}

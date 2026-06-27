import type { JsonValue } from './json-value';
import type { MediaAccess } from './media-access';
import type { MediaAiProvenance } from './media-ai-provenance';
import type { MediaChecksum } from './media-checksum';
import type { MediaKind } from './media-kind';
import type { MediaSource } from './media-source';

/** Media resource schema exposed by Claw Router. */
export interface MediaResource {
  /** Access field on media resource. */
  access?: MediaAccess;
  /** Ai field on media resource. */
  ai?: MediaAiProvenance;
  /** Alt text field on media resource. */
  altText?: string;
  /** Bucket id field on media resource. */
  bucketId?: string;
  /** Checksum field on media resource. */
  checksum?: MediaChecksum;
  /** Duration seconds field on media resource. */
  durationSeconds?: number;
  /** File name field on media resource. */
  fileName?: string;
  /** Height field on media resource. */
  height?: number;
  /** Id field on media resource. */
  id?: string;
  /** Kind field on media resource. */
  kind: MediaKind;
  /** Metadata field on media resource. */
  metadata?: Record<string, JsonValue>;
  /** Mime type field on media resource. */
  mimeType?: string;
  /** Object blob id field on media resource. */
  objectBlobId?: string;
  /** Object key field on media resource. */
  objectKey?: string;
  /** Object version field on media resource. */
  objectVersion?: string;
  /** Poster field on media resource. */
  poster?: MediaResource;
  /** Public url field on media resource. */
  publicUrl?: string;
  /** Size bytes field on media resource. */
  sizeBytes?: string;
  /** Source field on media resource. */
  source: MediaSource;
  /** Thumbnails field on media resource. */
  thumbnails?: MediaResource[];
  /** Title field on media resource. */
  title?: string;
  /** Uri field on media resource. */
  uri?: string;
  /** Url field on media resource. */
  url?: string;
  /** Variants field on media resource. */
  variants?: MediaResource[];
  /** Width field on media resource. */
  width?: number;
}

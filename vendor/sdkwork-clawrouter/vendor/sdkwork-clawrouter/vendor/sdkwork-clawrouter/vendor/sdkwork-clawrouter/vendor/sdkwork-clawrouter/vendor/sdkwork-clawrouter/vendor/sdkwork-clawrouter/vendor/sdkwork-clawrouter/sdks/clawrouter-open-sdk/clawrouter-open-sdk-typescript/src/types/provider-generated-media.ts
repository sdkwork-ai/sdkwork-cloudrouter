import type { ProviderGeneratedMediaMetadata } from './provider-generated-media-metadata';
import type { ProviderJsonValue } from './provider-json-value';

/** Reusable provider provider generated media schema shared by Claw Router vendor modules. */
export interface ProviderGeneratedMedia {
  /** Asset duration in seconds for audio or video. */
  duration?: number;
  /** Asset height in pixels. */
  height?: number;
  /** Generated asset identifier. */
  id?: string;
  /** Metadata field on the provider generated media, using the provider generated media metadata module. */
  metadata?: ProviderGeneratedMediaMetadata;
  /** Asset MIME type. */
  mime_type?: string;
  /** Provider asset URI. */
  uri?: string;
  /** Generated asset URL. */
  url?: string;
  /** Asset width in pixels. */
  width?: number;
}

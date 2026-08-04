import type { ProviderGeneratedMediaMetadata } from './provider-generated-media-metadata';
import type { ProviderJsonValue } from './provider-json-value';

/** Generated media record returned by Vidu task creation endpoints. */
export interface ViduCreation {
  /** Generated audio URL. */
  audio_url?: string;
  /** Cover image URL. */
  cover_url?: string;
  /** Creation timestamp. */
  created_at?: string;
  /** Media duration in seconds. */
  duration?: number;
  /** Media height in pixels. */
  height?: number;
  /** Vidu creation identifier. */
  id?: string;
  /** Generated image URL. */
  image_url?: string;
  /** Metadata field on the vidu creation, using the provider generated media metadata module. */
  metadata?: ProviderGeneratedMediaMetadata;
  /** Creation object type. */
  type?: string;
  /** Provider URI for the creation. */
  uri?: string;
  /** Primary creation URL. */
  url?: string;
  /** Generated video URL. */
  video_url?: string;
  /** Media width in pixels. */
  width?: number;
}

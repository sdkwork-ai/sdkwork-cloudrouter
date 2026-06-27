import type { ProviderGeneratedMedia } from './provider-generated-media';
import type { ProviderJsonValue } from './provider-json-value';
import type { ProviderMetadata } from './provider-metadata';
import type { VolcengineContentPart } from './volcengine-content-part';

/** Provider task result payload with common media result fields and typed extension values. */
export interface ProviderTaskResult {
  /** Generated audio assets. */
  audios?: ProviderGeneratedMedia[];
  /** Generated or transformed content parts. */
  content?: VolcengineContentPart[];
  /** Provider result identifier. */
  id?: string;
  /** Generated image assets. */
  images?: ProviderGeneratedMedia[];
  /** Metadata field on the provider task result, using the provider metadata module. */
  metadata?: ProviderMetadata;
  /** Provider result status. */
  status?: string;
  /** Generated text output when returned by the provider. */
  text?: string;
  /** Generated video assets. */
  videos?: ProviderGeneratedMedia[];
}

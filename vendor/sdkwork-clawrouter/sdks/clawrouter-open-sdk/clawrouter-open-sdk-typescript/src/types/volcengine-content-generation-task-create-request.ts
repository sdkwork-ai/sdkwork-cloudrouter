import type { ProviderJsonValue } from './provider-json-value';
import type { ProviderMetadata } from './provider-metadata';
import type { VolcengineContentPart } from './volcengine-content-part';

/** Volcengine Ark volcengine content generation task create request schema exposed by Claw Router vendor routing. */
export interface VolcengineContentGenerationTaskCreateRequest {
  /** Optional callback URL. */
  callback_url?: string;
  /** Input content parts for image, video, or multimodal generation. */
  content: VolcengineContentPart[];
  /** Metadata field on the volcengine content generation task create request, using the provider metadata module. */
  metadata?: ProviderMetadata;
  /** Volcengine Ark content generation model identifier. */
  model: string;
}

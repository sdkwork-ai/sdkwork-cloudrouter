import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible multipart request to create a skill version. */
export interface OpenAiSkillVersionCreateMultipartRequest {
  /** Skill version package archive or manifest file. */
  file: Blob;
  /** JSON-serialized skill version metadata. */
  metadata?: string;
  /** Human-readable skill version name. */
  name?: string;
  /** Skill package archive when the upstream expects this form field. */
  package?: Blob;
}

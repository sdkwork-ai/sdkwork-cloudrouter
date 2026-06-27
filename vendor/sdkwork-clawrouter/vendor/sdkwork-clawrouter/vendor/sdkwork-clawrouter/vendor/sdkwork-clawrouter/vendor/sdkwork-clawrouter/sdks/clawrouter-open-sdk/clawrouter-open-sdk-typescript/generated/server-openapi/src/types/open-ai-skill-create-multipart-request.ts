import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible multipart request to create a skill. */
export interface OpenAiSkillCreateMultipartRequest {
  /** Skill package archive or manifest file. */
  file: Blob;
  /** JSON-serialized skill metadata. */
  metadata?: string;
  /** Human-readable skill name. */
  name?: string;
  /** Skill package archive when the upstream expects this form field. */
  package?: Blob;
}

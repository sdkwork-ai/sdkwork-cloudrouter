import type { OpenAiProject } from './open-ai-project';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible paginated list of projects. */
export interface OpenAiProjectList {
  /** Projects in the returned page. */
  data: OpenAiProject[];
  /** Identifier of the first object in this page when provided. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in this page when provided. */
  last_id?: string | null;
  /** Object type, normally list. */
  object: 'list';
}

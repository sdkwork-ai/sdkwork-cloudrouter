import type { OpenAiSkillVersion } from './open-ai-skill-version';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible paginated list of skill versions. */
export interface OpenAiSkillVersionList {
  /** Skill versions in the returned page. */
  data: OpenAiSkillVersion[];
  /** Identifier of the first object in this page when provided. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in this page when provided. */
  last_id?: string | null;
  /** Object type, normally list. */
  object: 'list';
}

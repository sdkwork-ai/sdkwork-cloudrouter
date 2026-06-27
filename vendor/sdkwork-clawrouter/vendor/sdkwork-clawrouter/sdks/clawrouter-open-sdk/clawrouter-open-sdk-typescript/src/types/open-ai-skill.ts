import type { OpenAiSkillVersion } from './open-ai-skill-version';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible skill object exposed by Claw Router. */
export interface OpenAiSkill {
  /** Unix timestamp in seconds when the skill was created. */
  created_at: string;
  /** Human-readable skill description. */
  description?: string;
  /** Skill identifier. */
  id: string;
  /** Latest skill version identifier. */
  latest_version?: string;
  /** Developer-defined skill metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable skill name. */
  name: string;
  /** Object type, normally skill. */
  object: 'skill';
  /** Skill lifecycle status. */
  status?: string;
  /** Unix timestamp in seconds when the skill was last updated. */
  updated_at?: string;
  /** Skill versions returned inline when supported. */
  versions?: OpenAiSkillVersion[];
}

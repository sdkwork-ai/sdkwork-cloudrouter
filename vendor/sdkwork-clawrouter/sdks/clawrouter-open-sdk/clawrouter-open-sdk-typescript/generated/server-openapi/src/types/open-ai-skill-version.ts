import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible skill version object exposed by Claw Router. */
export interface OpenAiSkillVersion {
  /** Unix timestamp in seconds when the version was created. */
  created_at?: string;
  /** Skill version identifier. */
  id: string;
  /** Developer-defined skill version metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Object type, normally skill.version. */
  object: 'skill.version';
  /** SHA-256 digest of the uploaded skill package. */
  package_sha256?: string;
  /** Skill identifier that owns this version. */
  skill_id?: string;
  /** Skill version lifecycle status. */
  status?: string;
  /** Version label. */
  version: string;
}

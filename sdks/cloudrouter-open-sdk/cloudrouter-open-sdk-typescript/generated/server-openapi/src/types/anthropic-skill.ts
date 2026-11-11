import type { ProviderJsonValue } from './provider-json-value';

/** One skill loaded into an Anthropic container. */
export interface AnthropicSkill {
  /** Skill id. */
  skill_id: string;
  /** Built-in or user-defined skill. */
  type: 'anthropic' | 'custom';
  /** Skill version or `latest`. */
  version?: string;
}

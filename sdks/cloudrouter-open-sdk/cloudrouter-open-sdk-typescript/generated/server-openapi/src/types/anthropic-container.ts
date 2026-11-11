import type { AnthropicSkill } from './anthropic-skill';
import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic container selection and skills. */
export interface AnthropicContainer {
  /** Container id. */
  id?: string;
  /** Skills to load in the container. */
  skills?: AnthropicSkill[];
}

import type { OpenAiVideo } from './open-ai-video';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible paginated list of videos. */
export interface OpenAiVideoList {
  /** Videos in the returned page. */
  data: OpenAiVideo[];
  /** Identifier of the first object in this page when provided. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in this page when provided. */
  last_id?: string | null;
  /** Object type, normally list. */
  object: 'list';
}

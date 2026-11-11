import type { OpenAiFile } from './open-ai-file';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible paginated list of files. */
export interface OpenAiFileList {
  /** Files in the returned page. */
  data: OpenAiFile[];
  /** Identifier of the first object in this page when provided. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in this page when provided. */
  last_id?: string | null;
  /** Object type, normally list. */
  object: 'list';
}

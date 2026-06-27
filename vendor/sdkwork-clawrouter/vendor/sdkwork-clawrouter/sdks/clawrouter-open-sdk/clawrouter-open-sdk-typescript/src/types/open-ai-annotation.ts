import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai annotation schema exposed by Claw Router. */
export interface OpenAiAnnotation {
  /** End character index for the annotation. */
  end_index?: number;
  /** Referenced file identifier when applicable. */
  file_id?: string;
  /** Referenced filename when applicable. */
  filename?: string;
  /** Annotation index when returned by the upstream. */
  index?: number;
  /** Start character index for the annotation. */
  start_index?: number;
  /** Referenced URL title when applicable. */
  title?: string;
  /** Annotation type. */
  type: 'file_citation' | 'url_citation' | 'file_path';
  /** Referenced URL when applicable. */
  url?: string;
}

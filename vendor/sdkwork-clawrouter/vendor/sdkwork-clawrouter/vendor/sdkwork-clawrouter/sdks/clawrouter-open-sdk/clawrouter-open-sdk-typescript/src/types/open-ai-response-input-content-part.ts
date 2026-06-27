import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai response input content part schema exposed by Claw Router. */
export interface OpenAiResponseInputContentPart {
  /** Image detail preference when supported. */
  detail?: string;
  /** Inline file data for compatible upstreams. */
  file_data?: string;
  /** Uploaded file identifier for input_file parts. */
  file_id?: string;
  /** Filename for inline file inputs. */
  filename?: string;
  /** Image URL for input_image parts. */
  image_url?: string;
  /** Text for input_text parts. */
  text?: string;
  /** Responses API input content part type. */
  type: 'input_text' | 'input_image' | 'input_file';
}

import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai conversation content part schema exposed by Claw Router. */
export interface OpenAiConversationContentPart {
  /** Uploaded file identifier for file-backed content parts. */
  file_id?: string;
  /** Image URL for image parts when represented as a URL. */
  image_url?: string;
  /** Text content for text parts. */
  text?: string;
  /** Content part type, such as input_text, output_text, input_image, or provider-specific type. */
  type: string;
}

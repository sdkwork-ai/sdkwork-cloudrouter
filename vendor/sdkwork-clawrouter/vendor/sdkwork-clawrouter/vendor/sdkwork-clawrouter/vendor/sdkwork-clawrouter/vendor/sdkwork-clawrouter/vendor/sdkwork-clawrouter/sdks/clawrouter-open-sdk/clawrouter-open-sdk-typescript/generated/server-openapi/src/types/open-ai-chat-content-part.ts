import type { OpenAiChatFile } from './open-ai-chat-file';
import type { OpenAiChatImageUrl } from './open-ai-chat-image-url';
import type { OpenAiChatInputAudio } from './open-ai-chat-input-audio';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai chat content part schema exposed by Claw Router. */
export interface OpenAiChatContentPart {
  /** File field on the open ai chat content part, using the open ai chat file module. */
  file?: OpenAiChatFile;
  /** Image url field on the open ai chat content part, using the open ai chat image url module. */
  image_url?: OpenAiChatImageUrl;
  /** Input audio field on the open ai chat content part, using the open ai chat input audio module. */
  input_audio?: OpenAiChatInputAudio;
  /** Text content for text parts. */
  text?: string;
  /** Content part type, such as text, image_url, input_audio, or file. */
  type: 'text' | 'image_url' | 'input_audio' | 'file';
}

import type { AlibabaSpeechInput } from './alibaba-speech-input';
import type { ProviderJsonValue } from './provider-json-value';

/** Alibaba DashScope Qwen-Audio-TTS / CosyVoice speech synthesis request. */
export interface AlibabaSpeechRequest {
  /** Input field on the alibaba speech request, using the alibaba speech input module. */
  input: AlibabaSpeechInput;
  /** TTS model id, for example qwen3-tts-flash or cosyvoice-v2. */
  model: string;
  /** DashScope synthesis parameters such as rate, pitch, volume, format, and sample_rate. */
  parameters?: Record<string, ProviderJsonValue>;
}

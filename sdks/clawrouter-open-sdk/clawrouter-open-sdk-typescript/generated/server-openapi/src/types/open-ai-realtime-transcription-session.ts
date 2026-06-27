import type { OpenAiRealtimeClientSecretValue } from './open-ai-realtime-client-secret-value';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible realtime transcription session object. */
export interface OpenAiRealtimeTranscriptionSession {
  /** Client secret field on the open ai realtime transcription session, using the open ai realtime client secret value module. */
  client_secret?: OpenAiRealtimeClientSecretValue;
  /** Realtime transcription session identifier. */
  id: string;
  /** Input audio format for transcription. */
  input_audio_format?: string;
  /** Realtime transcription configuration. */
  input_audio_transcription?: ProviderJsonValue;
  /** Object type, normally realtime.transcription_session. */
  object: 'realtime.transcription_session';
}

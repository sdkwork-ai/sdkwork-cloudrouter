package types

// OpenAI-compatible realtime transcription session object.
type OpenAiRealtimeTranscriptionSession struct {
	ClientSecret OpenAiRealtimeClientSecretValue `json:"client_secret"`
	Id string `json:"id"`
	InputAudioFormat string `json:"input_audio_format"`
	InputAudioTranscription ProviderJsonValue `json:"input_audio_transcription"`
	Object string `json:"object"`
}

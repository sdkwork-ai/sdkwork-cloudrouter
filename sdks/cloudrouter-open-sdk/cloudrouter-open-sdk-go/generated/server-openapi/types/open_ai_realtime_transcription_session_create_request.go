package types

// OpenAI-compatible request to create a realtime transcription session.
type OpenAiRealtimeTranscriptionSessionCreateRequest struct {
	InputAudioFormat string `json:"input_audio_format"`
	InputAudioTranscription ProviderJsonValue `json:"input_audio_transcription"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Model string `json:"model"`
	TurnDetection ProviderJsonValue `json:"turn_detection"`
}

package types

// OpenAI-compatible request to create a realtime transcription session (`POST /v1/realtime/transcription_sessions`).
type OpenAiRealtimeTranscriptionSessionCreateRequest struct {
	Include []string `json:"include"`
	InputAudioFormat string `json:"input_audio_format"`
	InputAudioNoiseReduction map[string]ProviderJsonValue `json:"input_audio_noise_reduction"`
	InputAudioTranscription map[string]ProviderJsonValue `json:"input_audio_transcription"`
	TurnDetection map[string]ProviderJsonValue `json:"turn_detection"`
}

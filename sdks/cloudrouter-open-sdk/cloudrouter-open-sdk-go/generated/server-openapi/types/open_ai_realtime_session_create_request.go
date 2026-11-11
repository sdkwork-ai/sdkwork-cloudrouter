package types

// OpenAI-compatible request to create a realtime session (`POST /v1/realtime/sessions`).
type OpenAiRealtimeSessionCreateRequest struct {
	ClientSecret map[string]ProviderJsonValue `json:"client_secret"`
	InputAudioFormat string `json:"input_audio_format"`
	InputAudioTranscription map[string]ProviderJsonValue `json:"input_audio_transcription"`
	Instructions string `json:"instructions"`
	MaxResponseOutputTokens int `json:"max_response_output_tokens"`
	Modalities []string `json:"modalities"`
	OutputAudioFormat string `json:"output_audio_format"`
	Prompt map[string]ProviderJsonValue `json:"prompt"`
	Speed float64 `json:"speed"`
	Temperature float64 `json:"temperature"`
	ToolChoice string `json:"tool_choice"`
	Tools []map[string]ProviderJsonValue `json:"tools"`
	Tracing map[string]ProviderJsonValue `json:"tracing"`
	Truncation map[string]ProviderJsonValue `json:"truncation"`
	TurnDetection map[string]ProviderJsonValue `json:"turn_detection"`
	Voice string `json:"voice"`
}

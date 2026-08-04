package types

// OpenAI-compatible audio transcription response.
type OpenAiAudioTranscription struct {
	Duration float64 `json:"duration"`
	Language string `json:"language"`
	Segments []ProviderJsonValue `json:"segments"`
	Text string `json:"text"`
	Words []ProviderJsonValue `json:"words"`
}

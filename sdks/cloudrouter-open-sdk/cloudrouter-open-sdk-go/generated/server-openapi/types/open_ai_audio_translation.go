package types

// OpenAI-compatible audio translation response.
type OpenAiAudioTranslation struct {
	Duration float64 `json:"duration"`
	Segments []ProviderJsonValue `json:"segments"`
	Text string `json:"text"`
}

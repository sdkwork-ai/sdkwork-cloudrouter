package types

// DashScope TTS input envelope.
type AlibabaSpeechInput struct {
	Instructions string `json:"instructions"`
	LanguageType string `json:"language_type"`
	OptimizeInstructions bool `json:"optimize_instructions"`
	Text string `json:"text"`
	Voice string `json:"voice"`
}

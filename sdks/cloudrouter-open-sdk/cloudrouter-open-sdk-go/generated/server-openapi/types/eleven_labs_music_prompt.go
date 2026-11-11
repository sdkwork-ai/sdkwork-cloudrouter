package types

// Structured music prompt (deprecated in favor of `composition_plan`).
type ElevenLabsMusicPrompt struct {
	NegativeGlobalStyles []string `json:"negative_global_styles"`
	PositiveGlobalStyles []string `json:"positive_global_styles"`
	Sections []map[string]ProviderJsonValue `json:"sections"`
}

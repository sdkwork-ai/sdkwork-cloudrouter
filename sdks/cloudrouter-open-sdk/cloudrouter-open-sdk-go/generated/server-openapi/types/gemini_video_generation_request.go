package types

// Gemini video generation request schema exposed by Cloud Router.
type GeminiVideoGenerationRequest struct {
	Instances []map[string]ProviderJsonValue `json:"instances"`
	Parameters map[string]ProviderJsonValue `json:"parameters"`
}

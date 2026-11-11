package types

// Gemini image generation request schema exposed by Cloud Router.
type GeminiImageGenerationRequest struct {
	Instances []map[string]ProviderJsonValue `json:"instances"`
	Parameters map[string]ProviderJsonValue `json:"parameters"`
}

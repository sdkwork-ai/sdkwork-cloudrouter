package types

// Gemini image generation response schema exposed by Cloud Router.
type GeminiImageGenerationResponse struct {
	Error map[string]ProviderJsonValue `json:"error"`
	Predictions []map[string]ProviderJsonValue `json:"predictions"`
}

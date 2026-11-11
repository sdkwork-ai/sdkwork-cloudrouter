package types

// OpenAI-compatible request to compact response or conversation state (`POST /v1/responses/compact`).
type OpenAiResponseCompactRequest struct {
	Image map[string]ProviderJsonValue `json:"image"`
	Input ProviderJsonValue `json:"input"`
	Instructions string `json:"instructions"`
	Model string `json:"model"`
	PreviousResponseId string `json:"previous_response_id"`
	PromptCacheKey string `json:"prompt_cache_key"`
	PromptCacheOptions map[string]ProviderJsonValue `json:"prompt_cache_options"`
	PromptCacheRetention string `json:"prompt_cache_retention"`
	ServiceTier string `json:"service_tier"`
}

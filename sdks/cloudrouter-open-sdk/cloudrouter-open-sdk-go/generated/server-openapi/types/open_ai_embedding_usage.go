package types

// OpenAI-compatible open ai embedding usage schema exposed by Cloud Router.
type OpenAiEmbeddingUsage struct {
	PromptTokens int `json:"prompt_tokens"`
	TotalTokens int `json:"total_tokens"`
}

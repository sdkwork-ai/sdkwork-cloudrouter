package types

// OpenAI-compatible open ai embedding usage schema exposed by Claw Router.
type OpenAiEmbeddingUsage struct {
	PromptTokens int `json:"prompt_tokens"`
	TotalTokens int `json:"total_tokens"`
}

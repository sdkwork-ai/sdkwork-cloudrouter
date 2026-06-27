package types

// OpenAI-compatible open ai token usage schema exposed by Claw Router.
type OpenAiTokenUsage struct {
	CompletionTokens int `json:"completion_tokens"`
	CompletionTokensDetails OpenAiCompletionTokensDetails `json:"completion_tokens_details"`
	PromptTokens int `json:"prompt_tokens"`
	PromptTokensDetails OpenAiPromptTokensDetails `json:"prompt_tokens_details"`
	TotalTokens int `json:"total_tokens"`
}

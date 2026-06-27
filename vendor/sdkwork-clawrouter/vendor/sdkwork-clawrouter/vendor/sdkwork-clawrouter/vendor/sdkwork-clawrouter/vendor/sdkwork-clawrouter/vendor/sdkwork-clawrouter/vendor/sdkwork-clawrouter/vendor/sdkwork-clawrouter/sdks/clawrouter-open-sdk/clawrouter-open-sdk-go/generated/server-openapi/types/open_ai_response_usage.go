package types

// OpenAI-compatible open ai response usage schema exposed by Claw Router.
type OpenAiResponseUsage struct {
	InputTokens int `json:"input_tokens"`
	InputTokensDetails OpenAiResponseInputTokensDetails `json:"input_tokens_details"`
	OutputTokens int `json:"output_tokens"`
	OutputTokensDetails OpenAiResponseOutputTokensDetails `json:"output_tokens_details"`
	TotalTokens int `json:"total_tokens"`
}

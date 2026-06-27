package types

// Anthropic Claude anthropic usage schema exposed by Claw Router vendor routing.
type AnthropicUsage struct {
	CacheCreationInputTokens int `json:"cache_creation_input_tokens"`
	CacheReadInputTokens int `json:"cache_read_input_tokens"`
	InputTokens int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

package types

// Anthropic Claude anthropic count message tokens response schema exposed by Cloud Router vendor routing.
type AnthropicCountMessageTokensResponse struct {
	InputTokens int `json:"input_tokens"`
}

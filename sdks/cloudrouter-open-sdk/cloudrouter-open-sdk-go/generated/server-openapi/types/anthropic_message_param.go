package types

// Anthropic Claude anthropic message param schema exposed by Cloud Router vendor routing.
type AnthropicMessageParam struct {
	Content string `json:"content"`
	Role string `json:"role"`
}

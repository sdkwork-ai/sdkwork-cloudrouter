package types

// Anthropic Claude anthropic message param schema exposed by Claw Router vendor routing.
type AnthropicMessageParam struct {
	Content string `json:"content"`
	Role string `json:"role"`
}

package types

// Anthropic Claude anthropic content block schema exposed by Claw Router vendor routing.
type AnthropicContentBlock struct {
	Id string `json:"id"`
	Input AnthropicToolInput `json:"input"`
	Name string `json:"name"`
	Text string `json:"text"`
	Type string `json:"type"`
}

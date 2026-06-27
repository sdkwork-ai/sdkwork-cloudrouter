package types

// Anthropic Claude anthropic tool choice schema exposed by Claw Router vendor routing.
type AnthropicToolChoice struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

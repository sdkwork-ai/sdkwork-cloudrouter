package types

// Anthropic Claude anthropic tool choice schema exposed by Cloud Router vendor routing.
type AnthropicToolChoice struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

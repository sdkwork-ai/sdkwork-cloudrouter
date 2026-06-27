package types

// Anthropic Claude anthropic tool schema exposed by Claw Router vendor routing.
type AnthropicTool struct {
	Description string `json:"description"`
	InputSchema ProviderJsonSchema `json:"input_schema"`
	Name string `json:"name"`
}

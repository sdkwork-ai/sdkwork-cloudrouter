package types

// Anthropic JSON output format.
type AnthropicOutputFormat struct {
	Schema ProviderJsonSchema `json:"schema"`
	Type string `json:"type"`
}

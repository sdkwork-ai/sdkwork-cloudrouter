package types

// Anthropic output configuration.
type AnthropicOutputConfig struct {
	Effort string `json:"effort"`
	Format AnthropicOutputFormat `json:"format"`
}

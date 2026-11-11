package types

// Anthropic prompt-cache breakpoint.
type AnthropicCacheControl struct {
	Ttl string `json:"ttl"`
	Type string `json:"type"`
}

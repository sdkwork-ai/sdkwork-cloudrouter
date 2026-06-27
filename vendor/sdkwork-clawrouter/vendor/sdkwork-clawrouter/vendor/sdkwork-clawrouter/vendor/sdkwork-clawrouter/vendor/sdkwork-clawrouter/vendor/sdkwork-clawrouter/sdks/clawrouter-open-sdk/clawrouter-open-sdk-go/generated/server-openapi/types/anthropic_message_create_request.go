package types

// Anthropic Claude anthropic message create request schema exposed by Claw Router vendor routing.
type AnthropicMessageCreateRequest struct {
	MaxTokens int `json:"max_tokens"`
	Messages []AnthropicMessageParam `json:"messages"`
	Metadata ProviderMetadata `json:"metadata"`
	Model string `json:"model"`
	StopSequences []string `json:"stop_sequences"`
	Stream bool `json:"stream"`
	System string `json:"system"`
	Temperature float64 `json:"temperature"`
	Thinking AnthropicThinkingConfig `json:"thinking"`
	ToolChoice AnthropicToolChoice `json:"tool_choice"`
	Tools []AnthropicTool `json:"tools"`
	TopK int `json:"top_k"`
	TopP float64 `json:"top_p"`
}

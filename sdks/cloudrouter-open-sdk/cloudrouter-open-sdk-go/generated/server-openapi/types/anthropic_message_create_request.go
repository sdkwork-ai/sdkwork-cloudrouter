package types

// Anthropic Claude anthropic message create request schema exposed by Cloud Router vendor routing.
type AnthropicMessageCreateRequest struct {
	CacheControl AnthropicCacheControl `json:"cache_control"`
	Container AnthropicContainer `json:"container"`
	Diagnostics AnthropicDiagnostics `json:"diagnostics"`
	InferenceGeo string `json:"inference_geo"`
	MaxTokens int `json:"max_tokens"`
	Messages []AnthropicMessageParam `json:"messages"`
	Metadata AnthropicMetadata `json:"metadata"`
	Model string `json:"model"`
	OutputConfig AnthropicOutputConfig `json:"output_config"`
	ServiceTier string `json:"service_tier"`
	Speed string `json:"speed"`
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

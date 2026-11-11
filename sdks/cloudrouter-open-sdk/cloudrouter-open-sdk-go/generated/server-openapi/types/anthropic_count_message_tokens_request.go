package types

// Anthropic token-counting request (`POST /v1/messages/count_tokens`). The vendor accepts the conversation, system prompt, tools, and thinking configuration, but not the generation controls.
type AnthropicCountMessageTokensRequest struct {
	CacheControl AnthropicCacheControl `json:"cache_control"`
	Messages []AnthropicMessageParam `json:"messages"`
	Model string `json:"model"`
	OutputConfig AnthropicOutputConfig `json:"output_config"`
	Speed string `json:"speed"`
	System string `json:"system"`
	Thinking AnthropicThinkingConfig `json:"thinking"`
	ToolChoice AnthropicToolChoice `json:"tool_choice"`
	Tools []AnthropicTool `json:"tools"`
}

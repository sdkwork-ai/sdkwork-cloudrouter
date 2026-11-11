package types

// Ark video generation token usage.
type ArkVideoUsage struct {
	CompletionTokens int `json:"completion_tokens"`
	ToolUsage ArkVideoToolUsage `json:"tool_usage"`
	TotalTokens int `json:"total_tokens"`
}

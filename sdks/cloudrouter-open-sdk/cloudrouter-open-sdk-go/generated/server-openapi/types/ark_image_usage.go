package types

// Ark image generation usage.
type ArkImageUsage struct {
	GeneratedImages int `json:"generated_images"`
	InputImages int `json:"input_images"`
	OutputTokens int `json:"output_tokens"`
	ToolUsage ArkVideoToolUsage `json:"tool_usage"`
	TotalTokens int `json:"total_tokens"`
}

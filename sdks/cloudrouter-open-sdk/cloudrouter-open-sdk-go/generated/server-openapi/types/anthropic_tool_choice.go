package types

// Anthropic Claude anthropic tool choice schema exposed by Cloud Router vendor routing.
type AnthropicToolChoice struct {
	DisableParallelToolUse bool `json:"disable_parallel_tool_use"`
	Name string `json:"name"`
	Type string `json:"type"`
}

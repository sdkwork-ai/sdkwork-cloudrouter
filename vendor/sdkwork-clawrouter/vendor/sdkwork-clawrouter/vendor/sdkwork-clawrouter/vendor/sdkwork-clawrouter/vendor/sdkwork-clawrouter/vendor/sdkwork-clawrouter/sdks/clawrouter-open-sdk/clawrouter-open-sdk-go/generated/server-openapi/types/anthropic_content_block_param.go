package types

// Anthropic Claude anthropic content block param schema exposed by Claw Router vendor routing.
type AnthropicContentBlockParam struct {
	Content string `json:"content"`
	Id string `json:"id"`
	Input AnthropicToolInput `json:"input"`
	Name string `json:"name"`
	Source AnthropicContentSource `json:"source"`
	Text string `json:"text"`
	ToolUseId string `json:"tool_use_id"`
	Type string `json:"type"`
}

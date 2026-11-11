package types

// Anthropic content block (union member of `ContentBlockParam`).
type AnthropicContentBlockParam struct {
	CacheControl AnthropicCacheControl `json:"cache_control"`
	Caller map[string]ProviderJsonValue `json:"caller"`
	Citations []map[string]ProviderJsonValue `json:"citations"`
	Content string `json:"content"`
	Context string `json:"context"`
	Data string `json:"data"`
	Id string `json:"id"`
	Input AnthropicToolInput `json:"input"`
	IsError bool `json:"is_error"`
	Name string `json:"name"`
	Signature string `json:"signature"`
	Source AnthropicContentSource `json:"source"`
	Text string `json:"text"`
	Thinking string `json:"thinking"`
	Title string `json:"title"`
	ToolUseId string `json:"tool_use_id"`
	ToolsetName string `json:"toolset_name"`
	Type string `json:"type"`
}

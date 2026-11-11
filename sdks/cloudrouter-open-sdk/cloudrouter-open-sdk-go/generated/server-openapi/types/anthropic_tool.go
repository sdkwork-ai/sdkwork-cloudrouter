package types

// Anthropic custom client tool definition (the `Tool` member of `ToolUnion`).
type AnthropicTool struct {
	AllowedCallers []string `json:"allowed_callers"`
	CacheControl AnthropicCacheControl `json:"cache_control"`
	DeferLoading bool `json:"defer_loading"`
	Description string `json:"description"`
	EagerInputStreaming bool `json:"eager_input_streaming"`
	InputExamples []map[string]ProviderJsonValue `json:"input_examples"`
	InputSchema ProviderJsonSchema `json:"input_schema"`
	Name string `json:"name"`
	Strict bool `json:"strict"`
	Type string `json:"type"`
}

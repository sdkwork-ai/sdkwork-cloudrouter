package types

// OpenAI-compatible open ai responses request schema exposed by Claw Router.
type OpenAiResponsesRequest struct {
	Background bool `json:"background"`
	Conversation string `json:"conversation"`
	Include []string `json:"include"`
	Input string `json:"input"`
	Instructions string `json:"instructions"`
	MaxOutputTokens int `json:"max_output_tokens"`
	MaxToolCalls int `json:"max_tool_calls"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Model string `json:"model"`
	ParallelToolCalls bool `json:"parallel_tool_calls"`
	PreviousResponseId string `json:"previous_response_id"`
	Prompt OpenAiPromptReference `json:"prompt"`
	PromptCacheKey string `json:"prompt_cache_key"`
	Reasoning OpenAiReasoningConfig `json:"reasoning"`
	ServiceTier string `json:"service_tier"`
	Store bool `json:"store"`
	Stream bool `json:"stream"`
	Temperature float64 `json:"temperature"`
	Text OpenAiTextConfig `json:"text"`
	ToolChoice OpenAiToolChoice `json:"tool_choice"`
	Tools []OpenAiTool `json:"tools"`
	TopLogprobs int `json:"top_logprobs"`
	TopP float64 `json:"top_p"`
	Truncation string `json:"truncation"`
	User string `json:"user"`
}

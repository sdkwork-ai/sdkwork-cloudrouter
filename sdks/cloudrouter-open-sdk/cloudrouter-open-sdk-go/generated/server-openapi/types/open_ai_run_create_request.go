package types

// OpenAI-compatible request to create a thread run.
type OpenAiRunCreateRequest struct {
	AdditionalInstructions string `json:"additional_instructions"`
	AdditionalMessages []OpenAiThreadMessageCreateRequest `json:"additional_messages"`
	AssistantId string `json:"assistant_id"`
	Instructions string `json:"instructions"`
	MaxCompletionTokens int `json:"max_completion_tokens"`
	MaxPromptTokens int `json:"max_prompt_tokens"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Model string `json:"model"`
	ParallelToolCalls bool `json:"parallel_tool_calls"`
	ReasoningEffort string `json:"reasoning_effort"`
	ResponseFormat ProviderJsonValue `json:"response_format"`
	Stream bool `json:"stream"`
	Temperature float64 `json:"temperature"`
	ToolChoice ProviderJsonValue `json:"tool_choice"`
	Tools []ProviderJsonValue `json:"tools"`
	TopP float64 `json:"top_p"`
	TruncationStrategy ProviderJsonValue `json:"truncation_strategy"`
}

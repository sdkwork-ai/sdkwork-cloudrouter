package types

// OpenAI-compatible request to count tokens for a Responses API input (`POST /v1/responses/input_tokens`). Supply `input` or `previous_response_id`.
type OpenAiResponseInputTokenCountRequest struct {
	Conversation ProviderJsonValue `json:"conversation"`
	Input string `json:"input"`
	Instructions string `json:"instructions"`
	Model string `json:"model"`
	ParallelToolCalls bool `json:"parallel_tool_calls"`
	Personality ProviderJsonValue `json:"personality"`
	PreviousResponseId string `json:"previous_response_id"`
	Reasoning ProviderJsonValue `json:"reasoning"`
	Text ProviderJsonValue `json:"text"`
	ToolChoice ProviderJsonValue `json:"tool_choice"`
	Tools []ProviderJsonValue `json:"tools"`
	Truncation string `json:"truncation"`
}

package types

// OpenAI-compatible request to accept an inbound realtime call (`POST /v1/realtime/calls/{call_id}/accept`).
type OpenAiRealtimeCallActionRequest struct {
	Audio map[string]ProviderJsonValue `json:"audio"`
	Include []string `json:"include"`
	Instructions string `json:"instructions"`
	MaxOutputTokens int `json:"max_output_tokens"`
	Model string `json:"model"`
	OutputModalities []string `json:"output_modalities"`
	ParallelToolCalls bool `json:"parallel_tool_calls"`
	Prompt map[string]ProviderJsonValue `json:"prompt"`
	Reasoning map[string]ProviderJsonValue `json:"reasoning"`
	ToolChoice string `json:"tool_choice"`
	Tools []map[string]ProviderJsonValue `json:"tools"`
	Tracing map[string]ProviderJsonValue `json:"tracing"`
	Truncation map[string]ProviderJsonValue `json:"truncation"`
	Type string `json:"type"`
}

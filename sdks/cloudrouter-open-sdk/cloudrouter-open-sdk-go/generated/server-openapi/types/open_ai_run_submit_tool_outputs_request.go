package types

// OpenAI-compatible request to submit tool outputs for a run.
type OpenAiRunSubmitToolOutputsRequest struct {
	Stream bool `json:"stream"`
	ToolOutputs []ProviderJsonValue `json:"tool_outputs"`
}

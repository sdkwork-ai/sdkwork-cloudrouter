package types

// OpenAI-compatible request to update a thread.
type OpenAiThreadUpdateRequest struct {
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	ToolResources ProviderJsonValue `json:"tool_resources"`
}

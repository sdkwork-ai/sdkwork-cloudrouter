package types

// OpenAI-compatible request to create a thread.
type OpenAiThreadCreateRequest struct {
	Messages []OpenAiThreadMessageCreateRequest `json:"messages"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	ToolResources ProviderJsonValue `json:"tool_resources"`
}

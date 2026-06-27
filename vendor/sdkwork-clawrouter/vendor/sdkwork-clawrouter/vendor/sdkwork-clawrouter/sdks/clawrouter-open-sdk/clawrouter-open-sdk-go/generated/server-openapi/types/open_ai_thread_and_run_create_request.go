package types

// OpenAI-compatible request to create a thread and start a run.
type OpenAiThreadAndRunCreateRequest struct {
	AssistantId string `json:"assistant_id"`
	Instructions string `json:"instructions"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Model string `json:"model"`
	Stream bool `json:"stream"`
	Thread OpenAiThreadCreateRequest `json:"thread"`
	Tools []ProviderJsonValue `json:"tools"`
}

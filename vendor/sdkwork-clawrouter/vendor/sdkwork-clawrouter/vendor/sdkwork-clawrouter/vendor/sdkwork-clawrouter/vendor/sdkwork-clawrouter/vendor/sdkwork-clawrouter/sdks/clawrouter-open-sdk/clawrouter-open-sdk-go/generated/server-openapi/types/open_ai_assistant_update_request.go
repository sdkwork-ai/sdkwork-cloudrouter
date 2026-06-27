package types

// OpenAI-compatible request to update an assistant.
type OpenAiAssistantUpdateRequest struct {
	Description string `json:"description"`
	Instructions string `json:"instructions"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Model string `json:"model"`
	Name string `json:"name"`
	ResponseFormat ProviderJsonValue `json:"response_format"`
	Temperature float64 `json:"temperature"`
	ToolResources ProviderJsonValue `json:"tool_resources"`
	Tools []ProviderJsonValue `json:"tools"`
	TopP float64 `json:"top_p"`
}

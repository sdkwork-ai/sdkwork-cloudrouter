package types

// OpenAI-compatible assistant object.
type OpenAiAssistant struct {
	CreatedAt int `json:"created_at"`
	Description string `json:"description"`
	Id string `json:"id"`
	Instructions string `json:"instructions"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Model string `json:"model"`
	Name string `json:"name"`
	Object string `json:"object"`
	ResponseFormat ProviderJsonValue `json:"response_format"`
	Temperature float64 `json:"temperature"`
	ToolResources ProviderJsonValue `json:"tool_resources"`
	Tools []ProviderJsonValue `json:"tools"`
	TopP float64 `json:"top_p"`
}

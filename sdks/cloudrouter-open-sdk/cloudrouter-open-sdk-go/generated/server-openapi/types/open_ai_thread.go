package types

// OpenAI-compatible thread object.
type OpenAiThread struct {
	CreatedAt int `json:"created_at"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Object string `json:"object"`
	ToolResources ProviderJsonValue `json:"tool_resources"`
}

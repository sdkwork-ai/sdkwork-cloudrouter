package types

// Item module returned inside the listRuns list response.
type ListRunsItem struct {
	Content ProviderJsonValue `json:"content"`
	Created int `json:"created"`
	CreatedAt int `json:"created_at"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Model string `json:"model"`
	Object string `json:"object"`
	Output []ProviderJsonValue `json:"output"`
	Role string `json:"role"`
	Status string `json:"status"`
	Usage OpenAiTokenUsage `json:"usage"`
}

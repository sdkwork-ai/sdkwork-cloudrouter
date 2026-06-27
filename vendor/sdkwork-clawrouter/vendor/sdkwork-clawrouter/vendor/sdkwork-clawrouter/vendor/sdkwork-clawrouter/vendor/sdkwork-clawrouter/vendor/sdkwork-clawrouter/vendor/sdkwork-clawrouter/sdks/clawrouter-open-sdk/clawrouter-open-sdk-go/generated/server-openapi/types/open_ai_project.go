package types

// OpenAI-compatible organization project object.
type OpenAiProject struct {
	ArchivedAt int `json:"archived_at"`
	CreatedAt int `json:"created_at"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
	Object string `json:"object"`
	Status string `json:"status"`
}

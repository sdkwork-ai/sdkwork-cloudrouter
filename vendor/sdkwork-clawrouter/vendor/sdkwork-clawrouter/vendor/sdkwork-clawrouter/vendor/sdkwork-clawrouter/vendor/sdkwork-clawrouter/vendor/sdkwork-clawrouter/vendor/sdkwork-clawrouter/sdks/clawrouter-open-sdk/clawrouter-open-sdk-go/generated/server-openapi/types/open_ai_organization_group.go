package types

// OpenAI-compatible organization group object.
type OpenAiOrganizationGroup struct {
	CreatedAt int `json:"created_at"`
	Description string `json:"description"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
	Object string `json:"object"`
}

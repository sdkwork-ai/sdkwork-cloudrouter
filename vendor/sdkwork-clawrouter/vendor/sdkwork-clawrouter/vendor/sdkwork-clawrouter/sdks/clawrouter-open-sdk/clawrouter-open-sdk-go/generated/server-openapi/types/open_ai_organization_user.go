package types

// OpenAI-compatible organization user object.
type OpenAiOrganizationUser struct {
	CreatedAt int `json:"created_at"`
	Email string `json:"email"`
	Id string `json:"id"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
	Object string `json:"object"`
	Role string `json:"role"`
	Status string `json:"status"`
}

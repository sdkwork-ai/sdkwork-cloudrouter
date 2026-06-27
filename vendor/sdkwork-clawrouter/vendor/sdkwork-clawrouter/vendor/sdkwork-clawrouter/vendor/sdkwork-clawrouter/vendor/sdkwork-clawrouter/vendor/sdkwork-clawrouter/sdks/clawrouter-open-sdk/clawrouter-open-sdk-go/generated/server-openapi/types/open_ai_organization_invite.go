package types

// OpenAI-compatible organization invite object.
type OpenAiOrganizationInvite struct {
	CreatedAt int `json:"created_at"`
	Email string `json:"email"`
	ExpiresAt int `json:"expires_at"`
	Id string `json:"id"`
	Object string `json:"object"`
	Projects []ProviderJsonValue `json:"projects"`
	Role string `json:"role"`
	Status string `json:"status"`
}

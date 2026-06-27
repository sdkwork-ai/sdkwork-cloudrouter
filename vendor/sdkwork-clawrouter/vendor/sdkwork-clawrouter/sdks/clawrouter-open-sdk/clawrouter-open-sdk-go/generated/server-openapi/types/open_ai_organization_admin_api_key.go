package types

// OpenAI-compatible organization admin API key object.
type OpenAiOrganizationAdminApiKey struct {
	CreatedAt int `json:"created_at"`
	Id string `json:"id"`
	LastUsedAt int `json:"last_used_at"`
	Name string `json:"name"`
	Object string `json:"object"`
	Owner ProviderJsonValue `json:"owner"`
	RedactedValue string `json:"redacted_value"`
	Value string `json:"value"`
}

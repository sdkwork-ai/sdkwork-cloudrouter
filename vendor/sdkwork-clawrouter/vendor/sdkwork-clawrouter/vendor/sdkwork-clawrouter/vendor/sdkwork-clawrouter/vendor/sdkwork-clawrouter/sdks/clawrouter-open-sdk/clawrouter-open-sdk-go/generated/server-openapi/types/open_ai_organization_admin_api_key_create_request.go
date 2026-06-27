package types

// OpenAI-compatible request to create an organization admin API key.
type OpenAiOrganizationAdminApiKeyCreateRequest struct {
	Name string `json:"name"`
}

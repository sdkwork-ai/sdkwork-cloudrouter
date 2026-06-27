package types

// OpenAI-compatible request to create an organization group.
type OpenAiOrganizationGroupCreateRequest struct {
	Description string `json:"description"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
}

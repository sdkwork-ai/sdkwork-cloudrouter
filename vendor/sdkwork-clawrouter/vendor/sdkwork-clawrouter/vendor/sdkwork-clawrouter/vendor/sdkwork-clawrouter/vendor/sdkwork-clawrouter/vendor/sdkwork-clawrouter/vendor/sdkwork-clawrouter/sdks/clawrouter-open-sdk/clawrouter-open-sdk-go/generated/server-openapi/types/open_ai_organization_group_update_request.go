package types

// OpenAI-compatible request to update an organization group.
type OpenAiOrganizationGroupUpdateRequest struct {
	Description string `json:"description"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Name string `json:"name"`
}

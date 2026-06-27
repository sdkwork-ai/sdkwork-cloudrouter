package types

// OpenAI-compatible request to update an organization user.
type OpenAiOrganizationUserUpdateRequest struct {
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Role string `json:"role"`
}

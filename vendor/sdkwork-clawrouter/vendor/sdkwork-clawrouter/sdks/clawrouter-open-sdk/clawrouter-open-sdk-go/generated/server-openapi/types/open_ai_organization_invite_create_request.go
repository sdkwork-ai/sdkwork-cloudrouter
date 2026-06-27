package types

// OpenAI-compatible request to create an organization invite.
type OpenAiOrganizationInviteCreateRequest struct {
	Email string `json:"email"`
	Projects []ProviderJsonValue `json:"projects"`
	Role string `json:"role"`
}

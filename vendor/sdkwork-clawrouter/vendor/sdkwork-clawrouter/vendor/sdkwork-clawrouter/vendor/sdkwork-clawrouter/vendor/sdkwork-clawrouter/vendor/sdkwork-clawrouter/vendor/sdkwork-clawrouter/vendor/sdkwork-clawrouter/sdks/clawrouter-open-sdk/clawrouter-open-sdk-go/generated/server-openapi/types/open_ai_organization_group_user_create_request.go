package types

// OpenAI-compatible request to add a user to an organization group.
type OpenAiOrganizationGroupUserCreateRequest struct {
	UserId string `json:"user_id"`
}

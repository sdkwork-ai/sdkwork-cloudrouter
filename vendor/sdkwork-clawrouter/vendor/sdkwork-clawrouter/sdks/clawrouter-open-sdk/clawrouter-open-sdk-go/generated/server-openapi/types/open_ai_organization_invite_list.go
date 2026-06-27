package types

// OpenAI-compatible paginated list of organization invites.
type OpenAiOrganizationInviteList struct {
	Data []OpenAiOrganizationInvite `json:"data"`
	FirstId string `json:"first_id"`
	HasMore bool `json:"has_more"`
	LastId string `json:"last_id"`
	Object string `json:"object"`
}

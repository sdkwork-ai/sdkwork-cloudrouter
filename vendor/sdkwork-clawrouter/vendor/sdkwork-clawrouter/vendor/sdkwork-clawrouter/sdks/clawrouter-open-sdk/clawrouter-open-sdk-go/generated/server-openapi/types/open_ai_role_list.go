package types

// OpenAI-compatible paginated list of roles.
type OpenAiRoleList struct {
	Data []OpenAiRole `json:"data"`
	FirstId string `json:"first_id"`
	HasMore bool `json:"has_more"`
	LastId string `json:"last_id"`
	Object string `json:"object"`
}

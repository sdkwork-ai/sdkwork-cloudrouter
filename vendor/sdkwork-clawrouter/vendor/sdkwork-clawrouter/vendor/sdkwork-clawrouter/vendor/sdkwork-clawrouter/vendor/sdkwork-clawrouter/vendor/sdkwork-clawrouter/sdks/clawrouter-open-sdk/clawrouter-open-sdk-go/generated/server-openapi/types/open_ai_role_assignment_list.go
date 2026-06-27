package types

// OpenAI-compatible paginated list of role assignments.
type OpenAiRoleAssignmentList struct {
	Data []OpenAiRoleAssignment `json:"data"`
	FirstId string `json:"first_id"`
	HasMore bool `json:"has_more"`
	LastId string `json:"last_id"`
	Object string `json:"object"`
}

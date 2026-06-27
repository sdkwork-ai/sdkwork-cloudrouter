package types

// OpenAI-compatible paginated list of organization groups.
type OpenAiOrganizationGroupList struct {
	Data []OpenAiOrganizationGroup `json:"data"`
	FirstId string `json:"first_id"`
	HasMore bool `json:"has_more"`
	LastId string `json:"last_id"`
	Object string `json:"object"`
}

package types

// OpenAI-compatible paginated list of organization admin API keys.
type OpenAiOrganizationAdminApiKeyList struct {
	Data []OpenAiOrganizationAdminApiKey `json:"data"`
	FirstId string `json:"first_id"`
	HasMore bool `json:"has_more"`
	LastId string `json:"last_id"`
	Object string `json:"object"`
}

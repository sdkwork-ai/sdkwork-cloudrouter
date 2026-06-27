package types

// OpenAI-compatible paginated list of project service accounts.
type OpenAiProjectServiceAccountList struct {
	Data []OpenAiProjectServiceAccount `json:"data"`
	FirstId string `json:"first_id"`
	HasMore bool `json:"has_more"`
	LastId string `json:"last_id"`
	Object string `json:"object"`
}

package types

// OpenAI-compatible paginated list of run steps.
type OpenAiRunStepList struct {
	Data []OpenAiRunStep `json:"data"`
	FirstId string `json:"first_id"`
	HasMore bool `json:"has_more"`
	LastId string `json:"last_id"`
	Object string `json:"object"`
}

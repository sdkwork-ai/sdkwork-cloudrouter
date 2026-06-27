package types

// OpenAI-compatible paginated list of fine-tuning jobs.
type OpenAiFineTuningJobList struct {
	Data []OpenAiFineTuningJob `json:"data"`
	FirstId string `json:"first_id"`
	HasMore bool `json:"has_more"`
	LastId string `json:"last_id"`
	Object string `json:"object"`
}

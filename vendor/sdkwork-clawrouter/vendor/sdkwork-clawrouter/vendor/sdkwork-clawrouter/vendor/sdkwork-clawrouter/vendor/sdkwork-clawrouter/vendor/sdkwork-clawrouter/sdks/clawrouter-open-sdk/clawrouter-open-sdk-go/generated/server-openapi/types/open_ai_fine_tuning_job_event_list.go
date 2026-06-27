package types

// OpenAI-compatible paginated list of fine-tuning job events.
type OpenAiFineTuningJobEventList struct {
	Data []OpenAiFineTuningJobEvent `json:"data"`
	FirstId string `json:"first_id"`
	HasMore bool `json:"has_more"`
	LastId string `json:"last_id"`
	Object string `json:"object"`
}

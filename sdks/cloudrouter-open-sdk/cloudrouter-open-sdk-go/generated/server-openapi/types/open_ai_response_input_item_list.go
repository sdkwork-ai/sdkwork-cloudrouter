package types

// OpenAI-compatible paginated list of response input items.
type OpenAiResponseInputItemList struct {
	Data []OpenAiResponseInputItem `json:"data"`
	FirstId string `json:"first_id"`
	HasMore bool `json:"has_more"`
	LastId string `json:"last_id"`
	Object string `json:"object"`
}

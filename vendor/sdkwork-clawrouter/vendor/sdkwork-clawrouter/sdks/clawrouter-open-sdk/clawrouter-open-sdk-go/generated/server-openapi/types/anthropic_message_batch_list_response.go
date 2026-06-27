package types

// Anthropic Claude anthropic message batch list response schema exposed by Claw Router vendor routing.
type AnthropicMessageBatchListResponse struct {
	Data []AnthropicMessageBatch `json:"data"`
	FirstId string `json:"first_id"`
	HasMore bool `json:"has_more"`
	LastId string `json:"last_id"`
}

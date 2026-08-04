package types

// Anthropic Claude anthropic message batch create request schema exposed by Cloud Router vendor routing.
type AnthropicMessageBatchCreateRequest struct {
	Requests []AnthropicMessageBatchRequest `json:"requests"`
}

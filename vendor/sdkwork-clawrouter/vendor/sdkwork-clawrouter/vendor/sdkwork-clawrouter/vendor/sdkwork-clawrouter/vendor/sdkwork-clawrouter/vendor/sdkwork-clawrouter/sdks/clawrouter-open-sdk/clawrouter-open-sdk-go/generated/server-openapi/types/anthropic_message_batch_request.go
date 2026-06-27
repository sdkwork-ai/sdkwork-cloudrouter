package types

// Anthropic Claude anthropic message batch request schema exposed by Claw Router vendor routing.
type AnthropicMessageBatchRequest struct {
	CustomId string `json:"custom_id"`
	Params AnthropicMessageCreateRequest `json:"params"`
}

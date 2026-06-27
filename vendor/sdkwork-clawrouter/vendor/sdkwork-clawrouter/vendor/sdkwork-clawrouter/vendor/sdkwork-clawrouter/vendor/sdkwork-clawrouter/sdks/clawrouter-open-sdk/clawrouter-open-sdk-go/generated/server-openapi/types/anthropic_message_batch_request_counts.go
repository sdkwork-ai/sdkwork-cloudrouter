package types

// Anthropic Claude anthropic message batch request counts schema exposed by Claw Router vendor routing.
type AnthropicMessageBatchRequestCounts struct {
	Canceled int `json:"canceled"`
	Errored int `json:"errored"`
	Expired int `json:"expired"`
	Processing int `json:"processing"`
	Succeeded int `json:"succeeded"`
}

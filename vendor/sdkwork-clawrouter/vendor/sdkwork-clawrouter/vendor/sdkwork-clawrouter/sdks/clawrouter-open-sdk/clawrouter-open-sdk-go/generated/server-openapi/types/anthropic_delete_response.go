package types

// Anthropic Claude anthropic delete response schema exposed by Claw Router vendor routing.
type AnthropicDeleteResponse struct {
	Deleted bool `json:"deleted"`
	Id string `json:"id"`
	Type string `json:"type"`
}

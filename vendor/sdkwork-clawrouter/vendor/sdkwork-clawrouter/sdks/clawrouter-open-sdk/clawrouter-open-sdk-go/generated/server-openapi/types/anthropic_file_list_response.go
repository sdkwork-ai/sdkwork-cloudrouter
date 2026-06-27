package types

// Anthropic Claude anthropic file list response schema exposed by Claw Router vendor routing.
type AnthropicFileListResponse struct {
	Data []AnthropicFile `json:"data"`
	FirstId string `json:"first_id"`
	HasMore bool `json:"has_more"`
	LastId string `json:"last_id"`
}

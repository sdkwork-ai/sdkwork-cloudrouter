package types

// Anthropic Claude anthropic content source schema exposed by Claw Router vendor routing.
type AnthropicContentSource struct {
	Data string `json:"data"`
	FileId string `json:"file_id"`
	MediaType string `json:"media_type"`
	Type string `json:"type"`
	Url string `json:"url"`
}

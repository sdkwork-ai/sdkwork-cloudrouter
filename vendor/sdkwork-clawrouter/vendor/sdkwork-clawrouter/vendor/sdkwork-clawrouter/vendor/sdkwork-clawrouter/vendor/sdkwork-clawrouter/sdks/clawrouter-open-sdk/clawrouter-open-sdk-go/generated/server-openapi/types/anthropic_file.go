package types

// Anthropic Claude anthropic file schema exposed by Claw Router vendor routing.
type AnthropicFile struct {
	CreatedAt string `json:"created_at"`
	Downloadable bool `json:"downloadable"`
	Filename string `json:"filename"`
	Id string `json:"id"`
	MimeType string `json:"mime_type"`
	SizeBytes int `json:"size_bytes"`
	Type string `json:"type"`
}

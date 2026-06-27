package types

// Anthropic Claude anthropic file upload multipart request schema exposed by Claw Router vendor routing.
type AnthropicFileUploadMultipartRequest struct {
	File string `json:"file"`
}

package types

// OpenAI-compatible request to create an upload.
type OpenAiUploadCreateRequest struct {
	Bytes int `json:"bytes"`
	Filename string `json:"filename"`
	MimeType string `json:"mime_type"`
	Purpose string `json:"purpose"`
}

package types

// Google Gemini google blob schema exposed by Cloud Router vendor routing.
type GoogleBlob struct {
	Data string `json:"data"`
	MimeType string `json:"mimeType"`
}

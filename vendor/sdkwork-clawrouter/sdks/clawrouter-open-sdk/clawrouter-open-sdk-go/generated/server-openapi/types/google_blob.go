package types

// Google Gemini google blob schema exposed by Claw Router vendor routing.
type GoogleBlob struct {
	Data string `json:"data"`
	MimeType string `json:"mimeType"`
}

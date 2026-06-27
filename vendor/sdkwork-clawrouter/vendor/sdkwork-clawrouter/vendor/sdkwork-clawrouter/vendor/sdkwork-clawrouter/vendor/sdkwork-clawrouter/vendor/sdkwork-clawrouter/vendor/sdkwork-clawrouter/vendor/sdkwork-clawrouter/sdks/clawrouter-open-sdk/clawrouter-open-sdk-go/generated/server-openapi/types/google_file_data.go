package types

// Google Gemini google file data schema exposed by Claw Router vendor routing.
type GoogleFileData struct {
	FileUri string `json:"fileUri"`
	MimeType string `json:"mimeType"`
}

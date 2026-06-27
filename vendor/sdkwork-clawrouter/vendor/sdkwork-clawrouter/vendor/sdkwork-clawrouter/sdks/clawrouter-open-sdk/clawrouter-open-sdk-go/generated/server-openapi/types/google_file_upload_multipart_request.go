package types

// Google Gemini google file upload multipart request schema exposed by Claw Router vendor routing.
type GoogleFileUploadMultipartRequest struct {
	File string `json:"file"`
	Metadata string `json:"metadata"`
}

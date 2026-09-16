package types

// OpenAI-compatible open ai file upload request schema exposed by Cloud Router.
type OpenAiFileUploadRequest struct {
	File []byte `json:"file"`
	Purpose string `json:"purpose"`
}

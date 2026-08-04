package types

// OpenAI-compatible open ai file upload request schema exposed by Cloud Router.
type OpenAiFileUploadRequest struct {
	File string `json:"file"`
	Purpose string `json:"purpose"`
}

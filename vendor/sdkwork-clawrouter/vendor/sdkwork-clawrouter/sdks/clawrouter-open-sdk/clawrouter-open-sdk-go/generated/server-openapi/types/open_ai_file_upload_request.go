package types

// OpenAI-compatible open ai file upload request schema exposed by Claw Router.
type OpenAiFileUploadRequest struct {
	File string `json:"file"`
	Purpose string `json:"purpose"`
}

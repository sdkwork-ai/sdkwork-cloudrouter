package types

// OpenAI-compatible multipart request to upload or create a container file.
type OpenAiContainerFileCreateMultipartRequest struct {
	File string `json:"file"`
	Metadata string `json:"metadata"`
	Purpose string `json:"purpose"`
}

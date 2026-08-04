package types

// OpenAI-compatible open ai upload part multipart request schema exposed by Cloud Router.
type OpenAiUploadPartMultipartRequest struct {
	Data string `json:"data"`
}

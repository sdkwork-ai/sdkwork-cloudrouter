package types

// OpenAI-compatible open ai upload part multipart request schema exposed by Claw Router.
type OpenAiUploadPartMultipartRequest struct {
	Data string `json:"data"`
}

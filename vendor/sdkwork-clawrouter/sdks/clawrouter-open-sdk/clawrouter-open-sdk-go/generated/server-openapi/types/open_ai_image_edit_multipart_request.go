package types

// OpenAI-compatible open ai image edit multipart request schema exposed by Claw Router.
type OpenAiImageEditMultipartRequest struct {
	Image OpenAiBinaryFilePart `json:"image"`
	Mask OpenAiBinaryFilePart `json:"mask"`
	Model string `json:"model"`
	Prompt string `json:"prompt"`
}

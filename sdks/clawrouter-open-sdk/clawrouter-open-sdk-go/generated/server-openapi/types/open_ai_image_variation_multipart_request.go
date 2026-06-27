package types

// OpenAI-compatible open ai image variation multipart request schema exposed by Claw Router.
type OpenAiImageVariationMultipartRequest struct {
	Image OpenAiBinaryFilePart `json:"image"`
	Model string `json:"model"`
	Size string `json:"size"`
}

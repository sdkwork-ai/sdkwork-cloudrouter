package types

// OpenAI-compatible open ai image variation request schema exposed by Cloud Router.
type OpenAiImageVariationRequest struct {
	Image OpenAiImageReferenceInput `json:"image"`
	Model string `json:"model"`
	Size string `json:"size"`
}

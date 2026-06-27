package types

// OpenAI-compatible open ai image variation request schema exposed by Claw Router.
type OpenAiImageVariationRequest struct {
	Image OpenAiImageReferenceInput `json:"image"`
	Model string `json:"model"`
	Size string `json:"size"`
}

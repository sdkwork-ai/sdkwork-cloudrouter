package types

// OpenAI-compatible open ai image edit request schema exposed by Claw Router.
type OpenAiImageEditRequest struct {
	Image OpenAiImageReferenceInputList `json:"image"`
	Mask OpenAiImageReferenceInput `json:"mask"`
	Model string `json:"model"`
	Prompt string `json:"prompt"`
}

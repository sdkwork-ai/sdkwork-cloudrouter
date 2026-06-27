package types

// OpenAI-compatible open ai image generation request schema exposed by Claw Router.
type OpenAiImageGenerationRequest struct {
	Model string `json:"model"`
	Prompt string `json:"prompt"`
	Quality string `json:"quality"`
	ResponseFormat string `json:"response_format"`
	Size string `json:"size"`
}

package types

// Kling-compatible kling video generation request schema exposed by Claw Router vendor routing.
type KlingVideoGenerationRequest struct {
	AspectRatio string `json:"aspect_ratio"`
	CallbackUrl string `json:"callback_url"`
	CfgScale float64 `json:"cfg_scale"`
	Duration int `json:"duration"`
	Image string `json:"image"`
	ImageTail string `json:"image_tail"`
	Mode string `json:"mode"`
	Model string `json:"model"`
	NegativePrompt string `json:"negative_prompt"`
	Prompt string `json:"prompt"`
}

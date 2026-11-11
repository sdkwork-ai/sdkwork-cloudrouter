package types

// Stability AI Stable Image generation request (union of the `core`, `ultra`, and `sd3` multipart variants).
type StabilityImageGenerationRequest struct {
	AspectRatio string `json:"aspect_ratio"`
	CfgScale float64 `json:"cfg_scale"`
	Image string `json:"image"`
	Mode string `json:"mode"`
	Model string `json:"model"`
	NegativePrompt string `json:"negative_prompt"`
	OutputFormat string `json:"output_format"`
	Prompt string `json:"prompt"`
	Seed int `json:"seed"`
	Strength float64 `json:"strength"`
	StylePreset string `json:"style_preset"`
}

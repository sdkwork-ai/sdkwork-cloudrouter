package types

// Zhipu GLM-Image / CogView image generation request (`POST /api/paas/v4/images/generations`).
type ZhipuImageGenerationRequest struct {
	Model string `json:"model"`
	Prompt string `json:"prompt"`
	Quality string `json:"quality"`
	Size string `json:"size"`
	UserId string `json:"user_id"`
	WatermarkEnabled bool `json:"watermark_enabled"`
}

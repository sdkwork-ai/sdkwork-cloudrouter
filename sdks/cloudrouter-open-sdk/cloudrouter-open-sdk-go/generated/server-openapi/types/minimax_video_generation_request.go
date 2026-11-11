package types

// MiniMax Hailuo video generation task request.
type MinimaxVideoGenerationRequest struct {
	CallbackUrl string `json:"callback_url"`
	Duration int `json:"duration"`
	FastPretreatment bool `json:"fast_pretreatment"`
	FirstFrameImage string `json:"first_frame_image"`
	LastFrameImage string `json:"last_frame_image"`
	Model string `json:"model"`
	Prompt string `json:"prompt"`
	PromptOptimizer bool `json:"prompt_optimizer"`
	Resolution string `json:"resolution"`
}

package types

// MiniMax image generation request (union of the legacy text-to-image and image-to-image `/v1/image_generation` variants).
type MinimaxImageGenerationRequest struct {
	AspectRatio string `json:"aspect_ratio"`
	Height int `json:"height"`
	Model string `json:"model"`
	N int `json:"n"`
	Prompt string `json:"prompt"`
	PromptOptimizer bool `json:"prompt_optimizer"`
	ResponseFormat string `json:"response_format"`
	Seed int `json:"seed"`
	SubjectReference []map[string]ProviderJsonValue `json:"subject_reference"`
	Width int `json:"width"`
}

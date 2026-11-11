package types

// Stability AI image generation response.
type StabilityImageGenerationResponse struct {
	FinishReason string `json:"finish_reason"`
	Image string `json:"image"`
	Seed int `json:"seed"`
}

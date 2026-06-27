package types

// Midjourney-compatible midjourney image generation request schema exposed by Claw Router vendor routing.
type MidjourneyImageGenerationRequest struct {
	AspectRatio string `json:"aspect_ratio"`
	CallbackUrl string `json:"callback_url"`
	Model string `json:"model"`
	Prompt string `json:"prompt"`
	Seed int `json:"seed"`
	Style string `json:"style"`
}

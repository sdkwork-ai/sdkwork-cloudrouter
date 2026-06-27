package types

// Nano Banana compatible nano banana image generation request schema exposed by Claw Router vendor routing.
type NanoBananaImageGenerationRequest struct {
	AspectRatio string `json:"aspect_ratio"`
	CallbackUrl string `json:"callback_url"`
	Images []string `json:"images"`
	Model string `json:"model"`
	Prompt string `json:"prompt"`
	Seed int `json:"seed"`
	Size string `json:"size"`
}

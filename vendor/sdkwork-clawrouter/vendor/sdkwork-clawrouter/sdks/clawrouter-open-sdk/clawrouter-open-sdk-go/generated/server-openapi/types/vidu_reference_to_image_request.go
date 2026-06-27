package types

// Vidu vidu reference to image request schema exposed by Claw Router vendor routing.
type ViduReferenceToImageRequest struct {
	AspectRatio string `json:"aspect_ratio"`
	CallbackUrl string `json:"callback_url"`
	Images []string `json:"images"`
	Model string `json:"model"`
	Payload string `json:"payload"`
	Prompt string `json:"prompt"`
	Seed int `json:"seed"`
	Style string `json:"style"`
}

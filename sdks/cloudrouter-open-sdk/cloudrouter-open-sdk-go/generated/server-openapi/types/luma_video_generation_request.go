package types

// Luma Dream Machine video generation request (`POST /dream-machine/v1/generations/video`).
type LumaVideoGenerationRequest struct {
	AspectRatio string `json:"aspect_ratio"`
	CallbackUrl string `json:"callback_url"`
	Concepts []LumaConcept `json:"concepts"`
	Duration string `json:"duration"`
	GenerationType string `json:"generation_type"`
	Keyframes LumaKeyframes `json:"keyframes"`
	Loop bool `json:"loop"`
	Model string `json:"model"`
	Prompt string `json:"prompt"`
	Resolution string `json:"resolution"`
}

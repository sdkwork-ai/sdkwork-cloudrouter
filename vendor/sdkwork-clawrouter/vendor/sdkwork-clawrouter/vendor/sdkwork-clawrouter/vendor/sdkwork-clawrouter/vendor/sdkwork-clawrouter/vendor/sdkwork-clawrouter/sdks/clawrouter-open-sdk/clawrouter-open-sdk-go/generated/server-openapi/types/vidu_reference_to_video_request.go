package types

// Vidu vidu reference to video request schema exposed by Claw Router vendor routing.
type ViduReferenceToVideoRequest struct {
	AspectRatio string `json:"aspect_ratio"`
	CallbackUrl string `json:"callback_url"`
	Duration int `json:"duration"`
	Images []string `json:"images"`
	Model string `json:"model"`
	MovementAmplitude string `json:"movement_amplitude"`
	Payload string `json:"payload"`
	Prompt string `json:"prompt"`
	Resolution string `json:"resolution"`
	Seed int `json:"seed"`
}

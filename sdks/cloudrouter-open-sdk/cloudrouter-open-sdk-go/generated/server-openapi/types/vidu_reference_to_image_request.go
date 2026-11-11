package types

// Vidu vidu reference to image request schema exposed by Cloud Router vendor routing.
type ViduReferenceToImageRequest struct {
	AspectRatio string `json:"aspect_ratio"`
	Bgm bool `json:"bgm"`
	CallbackUrl string `json:"callback_url"`
	Images []string `json:"images"`
	Model string `json:"model"`
	OffPeak bool `json:"off_peak"`
	Payload string `json:"payload"`
	Prompt string `json:"prompt"`
	Resolution string `json:"resolution"`
	Seed int `json:"seed"`
}

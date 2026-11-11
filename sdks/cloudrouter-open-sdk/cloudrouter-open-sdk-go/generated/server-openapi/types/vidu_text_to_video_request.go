package types

// Vidu vidu text to video request schema exposed by Cloud Router vendor routing.
type ViduTextToVideoRequest struct {
	AspectRatio string `json:"aspect_ratio"`
	Audio bool `json:"audio"`
	CallbackUrl string `json:"callback_url"`
	Duration int `json:"duration"`
	MetaData string `json:"meta_data"`
	Model string `json:"model"`
	OffPeak bool `json:"off_peak"`
	Payload string `json:"payload"`
	Prompt string `json:"prompt"`
	Resolution string `json:"resolution"`
	Seed int `json:"seed"`
	Watermark bool `json:"watermark"`
	WmPosition int `json:"wm_position"`
	WmUrl string `json:"wm_url"`
}

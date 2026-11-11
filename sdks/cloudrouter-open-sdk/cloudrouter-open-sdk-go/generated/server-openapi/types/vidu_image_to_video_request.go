package types

// Vidu vidu image to video request schema exposed by Cloud Router vendor routing.
type ViduImageToVideoRequest struct {
	Audio bool `json:"audio"`
	CallbackUrl string `json:"callback_url"`
	Duration int `json:"duration"`
	Images []string `json:"images"`
	IsRec bool `json:"is_rec"`
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

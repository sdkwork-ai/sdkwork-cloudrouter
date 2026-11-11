package types

// Vidu scene-template request (`POST /ent/v2/template`).
type ViduTemplateRequest struct {
	Area string `json:"area"`
	AspectRatio string `json:"aspect_ratio"`
	Beast string `json:"beast"`
	Bgm bool `json:"bgm"`
	CallbackUrl string `json:"callback_url"`
	Images []string `json:"images"`
	MetaData string `json:"meta_data"`
	OffPeak bool `json:"off_peak"`
	Payload string `json:"payload"`
	Prompt string `json:"prompt"`
	Seed int `json:"seed"`
	Template string `json:"template"`
	VideoUrls []string `json:"video_urls"`
	Watermark bool `json:"watermark"`
	WmPosition int `json:"wm_position"`
	WmUrl string `json:"wm_url"`
}

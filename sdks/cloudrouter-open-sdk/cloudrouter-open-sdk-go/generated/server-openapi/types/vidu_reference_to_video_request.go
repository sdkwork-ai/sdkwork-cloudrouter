package types

// Vidu vidu reference to video request schema exposed by Cloud Router vendor routing.
type ViduReferenceToVideoRequest struct {
	AspectRatio string `json:"aspect_ratio"`
	Audio bool `json:"audio"`
	AutoSubjects bool `json:"auto_subjects"`
	Bgm bool `json:"bgm"`
	CallbackUrl string `json:"callback_url"`
	Duration int `json:"duration"`
	Images []string `json:"images"`
	MetaData string `json:"meta_data"`
	Model string `json:"model"`
	MovementAmplitude string `json:"movement_amplitude"`
	OffPeak bool `json:"off_peak"`
	Payload string `json:"payload"`
	Prompt string `json:"prompt"`
	Resolution string `json:"resolution"`
	Seed int `json:"seed"`
	Sounds []map[string]ProviderJsonValue `json:"sounds"`
	Subjects []map[string]ProviderJsonValue `json:"subjects"`
	Watermark bool `json:"watermark"`
	WmPosition int `json:"wm_position"`
	WmUrl string `json:"wm_url"`
}

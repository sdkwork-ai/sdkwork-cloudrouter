package types

// Vidu vidu image generation task schema exposed by Cloud Router vendor routing.
type ViduImageGenerationTask struct {
	AspectRatio string `json:"aspect_ratio"`
	CallbackUrl string `json:"callback_url"`
	CreatedAt string `json:"created_at"`
	Creations []ViduCreation `json:"creations"`
	Credits int `json:"credits"`
	Duration int `json:"duration"`
	ErrCode string `json:"err_code"`
	Images []string `json:"images"`
	Model string `json:"model"`
	OffPeak bool `json:"off_peak"`
	Payload string `json:"payload"`
	Prompt string `json:"prompt"`
	Resolution string `json:"resolution"`
	Seed int `json:"seed"`
	State string `json:"state"`
	TaskId string `json:"task_id"`
	Watermark bool `json:"watermark"`
}

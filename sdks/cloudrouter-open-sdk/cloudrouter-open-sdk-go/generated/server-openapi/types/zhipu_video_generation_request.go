package types

// Zhipu CogVideoX video generation request (`POST /api/paas/v4/videos/generations`). `prompt` or `image_url` must be supplied.
type ZhipuVideoGenerationRequest struct {
	Duration int `json:"duration"`
	Fps int `json:"fps"`
	ImageUrl string `json:"image_url"`
	Model string `json:"model"`
	Prompt string `json:"prompt"`
	Quality string `json:"quality"`
	RequestId string `json:"request_id"`
	Size string `json:"size"`
	UserId string `json:"user_id"`
	WatermarkEnabled bool `json:"watermark_enabled"`
	WithAudio bool `json:"with_audio"`
}

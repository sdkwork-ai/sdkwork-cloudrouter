package types

// PixVerse text-to-video generation request (`POST /openapi/v2/video/text/generate`).
type PixverseVideoGenerationRequest struct {
	AspectRatio string `json:"aspect_ratio"`
	Duration int `json:"duration"`
	GenerateAudioSwitch bool `json:"generate_audio_switch"`
	GenerateMultiClipSwitch bool `json:"generate_multi_clip_switch"`
	Model string `json:"model"`
	Prompt string `json:"prompt"`
	Quality string `json:"quality"`
	Seed int `json:"seed"`
	WebhookId string `json:"webhook_id"`
}

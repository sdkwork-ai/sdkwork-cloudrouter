package types

// Kling-compatible kling avatar create request schema exposed by Cloud Router vendor routing.
type KlingAvatarCreateRequest struct {
	AudioUrl string `json:"audio_url"`
	CallbackUrl string `json:"callback_url"`
	HumanImage string `json:"human_image"`
	ModelName string `json:"model_name"`
	Prompt string `json:"prompt"`
	Text string `json:"text"`
	VoiceId string `json:"voice_id"`
	VoiceLanguage string `json:"voice_language"`
	VoiceMode string `json:"voice_mode"`
}

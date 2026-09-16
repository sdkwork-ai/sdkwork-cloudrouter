package types

// Kling avatar (digital human) video generation request schema exposed by Cloud Router vendor routing.
type KlingAvatarCreateRequest struct {
	ModelName string `json:"model_name"`
	HumanImage string `json:"human_image"`
	Prompt string `json:"prompt"`
	VoiceMode string `json:"voice_mode"`
	AudioUrl string `json:"audio_url"`
	Text string `json:"text"`
	VoiceId string `json:"voice_id"`
	VoiceLanguage string `json:"voice_language"`
	CallbackUrl string `json:"callback_url"`
}

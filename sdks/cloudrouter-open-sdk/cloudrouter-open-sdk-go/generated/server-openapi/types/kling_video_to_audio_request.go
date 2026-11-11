package types

// Kling video-to-sound-effect request (`POST /v1/audio/video-to-audio`). Supply `video_id` or `video_url`.
type KlingVideoToAudioRequest struct {
	AsmrMode bool `json:"asmr_mode"`
	BgmPrompt string `json:"bgm_prompt"`
	CallbackUrl string `json:"callback_url"`
	ExternalTaskId string `json:"external_task_id"`
	SoundEffectPrompt string `json:"sound_effect_prompt"`
	VideoId string `json:"video_id"`
	VideoUrl string `json:"video_url"`
}

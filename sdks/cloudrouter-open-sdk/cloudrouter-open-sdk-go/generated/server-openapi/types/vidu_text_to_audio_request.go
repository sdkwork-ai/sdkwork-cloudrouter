package types

// Vidu text-to-audio request (`POST /ent/v2/text2audio`).
type ViduTextToAudioRequest struct {
	Bgm bool `json:"bgm"`
	CallbackUrl string `json:"callback_url"`
	Duration float64 `json:"duration"`
	Model string `json:"model"`
	OffPeak bool `json:"off_peak"`
	Payload string `json:"payload"`
	Prompt string `json:"prompt"`
	Seed int `json:"seed"`
}

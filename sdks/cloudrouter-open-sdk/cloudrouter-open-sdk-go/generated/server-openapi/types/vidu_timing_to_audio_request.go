package types

// Vidu timing-to-audio request (`POST /ent/v2/timing2audio`).
type ViduTimingToAudioRequest struct {
	Bgm bool `json:"bgm"`
	CallbackUrl string `json:"callback_url"`
	Duration float64 `json:"duration"`
	Model string `json:"model"`
	OffPeak bool `json:"off_peak"`
	Payload string `json:"payload"`
	Seed int `json:"seed"`
	TimingPrompts []map[string]ProviderJsonValue `json:"timing_prompts"`
}

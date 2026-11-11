package types

// ElevenLabs audio effects applied to generated speech.
type ElevenLabsAudioEffects struct {
	BackgroundNoiseId string `json:"background_noise_id"`
	Distance float64 `json:"distance"`
	EnvironmentId string `json:"environment_id"`
	FilterPresetId string `json:"filter_preset_id"`
	Pan float64 `json:"pan"`
	SendLevel float64 `json:"send_level"`
}

package types

// MiniMax TTS voice effects.
type MinimaxVoiceModify struct {
	Intensity int `json:"intensity"`
	Pitch int `json:"pitch"`
	SoundEffects string `json:"sound_effects"`
	Timbre int `json:"timbre"`
}

package types

// ByteDance TTS output audio parameters.
type BytedanceTtsAudioParams struct {
	Format string `json:"format"`
	LoudnessRate int `json:"loudness_rate"`
	SampleRate int `json:"sample_rate"`
	SpeechRate int `json:"speech_rate"`
}

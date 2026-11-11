package types

// MiniMax music audio output configuration.
type MiniMaxMusicAudioSetting struct {
	Bitrate int `json:"bitrate"`
	Format string `json:"format"`
	SampleRate int `json:"sample_rate"`
}

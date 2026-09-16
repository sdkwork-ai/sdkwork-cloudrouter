package types

// MiniMax music generation audio setting.
type MiniMaxMusicAudioSetting struct {
	SampleRate int `json:"sample_rate"`
	Bitrate int `json:"bitrate"`
	Format string `json:"format"`
}

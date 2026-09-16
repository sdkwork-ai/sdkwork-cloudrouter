package types

// Mini max music audio setting schema exposed by Cloud Router.
type MiniMaxMusicAudioSetting struct {
	Bitrate int `json:"bitrate"`
	Format string `json:"format"`
	SampleRate int `json:"sample_rate"`
}

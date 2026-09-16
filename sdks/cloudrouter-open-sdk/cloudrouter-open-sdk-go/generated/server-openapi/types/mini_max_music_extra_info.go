package types

// MiniMax music generation extra metadata.
type MiniMaxMusicExtraInfo struct {
	MusicDuration float64 `json:"music_duration"`
	MusicSampleRate int `json:"music_sample_rate"`
	MusicChannel int `json:"music_channel"`
	Bitrate int `json:"bitrate"`
	MusicSize int `json:"music_size"`
}

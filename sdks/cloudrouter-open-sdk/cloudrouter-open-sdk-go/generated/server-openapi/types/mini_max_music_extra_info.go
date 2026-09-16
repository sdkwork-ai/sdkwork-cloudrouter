package types

// Mini max music extra info schema exposed by Cloud Router.
type MiniMaxMusicExtraInfo struct {
	Bitrate int `json:"bitrate"`
	MusicChannel int `json:"music_channel"`
	MusicDuration float64 `json:"music_duration"`
	MusicSampleRate int `json:"music_sample_rate"`
	MusicSize int `json:"music_size"`
}

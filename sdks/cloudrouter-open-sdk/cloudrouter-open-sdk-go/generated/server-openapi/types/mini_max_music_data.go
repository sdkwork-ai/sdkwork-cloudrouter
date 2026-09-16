package types

// MiniMax music generation data payload.
type MiniMaxMusicData struct {
	Status int `json:"status"`
	Audio string `json:"audio"`
	ExtraInfo MiniMaxMusicExtraInfo `json:"extra_info"`
}

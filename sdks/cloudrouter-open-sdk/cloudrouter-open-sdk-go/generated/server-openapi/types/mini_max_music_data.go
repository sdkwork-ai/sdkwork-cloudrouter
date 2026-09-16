package types

// Mini max music data schema exposed by Cloud Router.
type MiniMaxMusicData struct {
	Audio string `json:"audio"`
	ExtraInfo MiniMaxMusicExtraInfo `json:"extra_info"`
	Status int `json:"status"`
}

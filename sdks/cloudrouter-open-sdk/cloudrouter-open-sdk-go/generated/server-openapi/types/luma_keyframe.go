package types

// One Luma keyframe: an image URL (`type=image`) or another generation id (`type=generation`).
type LumaKeyframe struct {
	Id string `json:"id"`
	Type string `json:"type"`
	Url string `json:"url"`
}

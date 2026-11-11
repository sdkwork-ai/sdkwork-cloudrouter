package types

// Video output content of an Ark content generation task.
type ArkVideoTaskContent struct {
	LastFrameUrl string `json:"last_frame_url"`
	VideoUrl string `json:"video_url"`
}

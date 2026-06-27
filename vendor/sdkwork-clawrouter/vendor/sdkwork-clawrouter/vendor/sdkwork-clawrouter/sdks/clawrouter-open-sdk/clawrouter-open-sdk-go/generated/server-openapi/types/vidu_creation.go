package types

// Generated media record returned by Vidu task creation endpoints.
type ViduCreation struct {
	AudioUrl string `json:"audio_url"`
	CoverUrl string `json:"cover_url"`
	CreatedAt string `json:"created_at"`
	Duration float64 `json:"duration"`
	Height int `json:"height"`
	Id string `json:"id"`
	ImageUrl string `json:"image_url"`
	Metadata ProviderGeneratedMediaMetadata `json:"metadata"`
	Type string `json:"type"`
	Uri string `json:"uri"`
	Url string `json:"url"`
	VideoUrl string `json:"video_url"`
	Width int `json:"width"`
}

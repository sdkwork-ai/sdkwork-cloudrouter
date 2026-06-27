package types

// Suno-compatible suno music track schema exposed by Claw Router vendor routing.
type SunoMusicTrack struct {
	AudioUrl string `json:"audio_url"`
	Duration float64 `json:"duration"`
	Id string `json:"id"`
	ImageUrl string `json:"image_url"`
	Lyrics string `json:"lyrics"`
	Title string `json:"title"`
	VideoUrl string `json:"video_url"`
}

package types

// Dashboard chart point schema exposed by Claw Router.
type DashboardChartPoint struct {
	AudioWhisper float64 `json:"audio (Whisper)"`
	ImageMidjourneyDALLE float64 `json:"image (Midjourney/DALL-E)"`
	LlmText float64 `json:"llm (Text)"`
	MusicSuno float64 `json:"music (Suno)"`
	Time string `json:"time"`
	VideoRunwaySora float64 `json:"video (Runway/Sora)"`
}

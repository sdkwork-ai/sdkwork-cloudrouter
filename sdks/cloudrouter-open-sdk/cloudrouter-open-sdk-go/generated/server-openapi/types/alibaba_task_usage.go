package types

// DashScope task usage counters.
type AlibabaTaskUsage struct {
	SR int `json:"SR"`
	Duration float64 `json:"duration"`
	ImageCount int `json:"image_count"`
	InputVideoDuration int `json:"input_video_duration"`
	OutputVideoDuration int `json:"output_video_duration"`
	Ratio string `json:"ratio"`
}

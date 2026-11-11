package types

// Stability AI Stable Audio text-to-audio request, sent as multipart/form-data.
type StabilityAudioRequest struct {
	CfgScale float64 `json:"cfg_scale"`
	Duration float64 `json:"duration"`
	Model string `json:"model"`
	OutputFormat string `json:"output_format"`
	Prompt string `json:"prompt"`
	Seed int `json:"seed"`
	Steps int `json:"steps"`
}

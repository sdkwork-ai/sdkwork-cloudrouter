package types

// OpenAI-compatible request to synthesize speech audio.
type OpenAiSpeechCreateRequest struct {
	Input string `json:"input"`
	Instructions string `json:"instructions"`
	Model string `json:"model"`
	ResponseFormat string `json:"response_format"`
	Speed float64 `json:"speed"`
	StreamFormat string `json:"stream_format"`
	Voice string `json:"voice"`
}

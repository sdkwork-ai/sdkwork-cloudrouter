package types

// OpenAI-compatible request to synthesize speech audio.
type OpenAiSpeechCreateRequest struct {
	Input string `json:"input"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Model string `json:"model"`
	ResponseFormat string `json:"response_format"`
	Speed float64 `json:"speed"`
	Voice string `json:"voice"`
}

package types

// OpenAI-compatible request to create a video.
type OpenAiVideoCreateRequest struct {
	Image ProviderJsonValue `json:"image"`
	Metadata map[string]ProviderJsonValue `json:"metadata"`
	Model string `json:"model"`
	Prompt string `json:"prompt"`
	Seconds int `json:"seconds"`
	Size string `json:"size"`
	Video ProviderJsonValue `json:"video"`
}

package types

// OpenAI-compatible request to extend a video (`POST /v1/videos/extensions`).
type OpenAiVideoExtendRequest struct {
	Prompt string `json:"prompt"`
	Seconds string `json:"seconds"`
	Video ProviderJsonValue `json:"video"`
}

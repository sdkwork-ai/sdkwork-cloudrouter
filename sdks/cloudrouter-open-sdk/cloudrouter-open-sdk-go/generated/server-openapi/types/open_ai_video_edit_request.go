package types

// OpenAI-compatible request to edit a video (`POST /v1/videos/edits`).
type OpenAiVideoEditRequest struct {
	Prompt string `json:"prompt"`
	Video ProviderJsonValue `json:"video"`
}

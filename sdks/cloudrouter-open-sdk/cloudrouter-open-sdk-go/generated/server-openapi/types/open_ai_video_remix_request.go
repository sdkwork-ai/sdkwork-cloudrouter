package types

// OpenAI-compatible request to remix a video (`POST /v1/videos/{video_id}/remix`).
type OpenAiVideoRemixRequest struct {
	Prompt string `json:"prompt"`
}

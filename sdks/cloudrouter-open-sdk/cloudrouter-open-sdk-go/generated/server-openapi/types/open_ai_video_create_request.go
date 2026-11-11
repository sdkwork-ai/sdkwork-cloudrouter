package types

// OpenAI-compatible request to create a video (`POST /v1/videos`).
type OpenAiVideoCreateRequest struct {
	InputReference map[string]ProviderJsonValue `json:"input_reference"`
	Model string `json:"model"`
	Prompt string `json:"prompt"`
	Seconds string `json:"seconds"`
	Size string `json:"size"`
}

package types

// xAI video edit request (EditVideoRequest).
type XaiVideoEditRequest struct {
	Model string `json:"model"`
	Output map[string]ProviderJsonValue `json:"output"`
	Prompt string `json:"prompt"`
	StorageOptions map[string]ProviderJsonValue `json:"storage_options"`
	User string `json:"user"`
	Video XaiVideoInput `json:"video"`
}

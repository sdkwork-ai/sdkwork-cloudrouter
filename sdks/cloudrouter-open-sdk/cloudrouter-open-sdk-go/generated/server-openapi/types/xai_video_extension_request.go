package types

// xAI video extension request (ExtendVideoRequest).
type XaiVideoExtensionRequest struct {
	Duration int `json:"duration"`
	Model string `json:"model"`
	Output map[string]ProviderJsonValue `json:"output"`
	Prompt string `json:"prompt"`
	StorageOptions map[string]ProviderJsonValue `json:"storage_options"`
	Video XaiVideoInput `json:"video"`
}

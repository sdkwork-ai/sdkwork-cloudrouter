package types

// Luma Dream Machine generation record and its assets.
type LumaVideoGenerationTask struct {
	Assets LumaGenerationAssets `json:"assets"`
	CreatedAt string `json:"created_at"`
	FailureReason string `json:"failure_reason"`
	GenerationType string `json:"generation_type"`
	Id string `json:"id"`
	Model string `json:"model"`
	Request map[string]ProviderJsonValue `json:"request"`
	State string `json:"state"`
}

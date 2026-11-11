package types

// Alibaba DashScope Wan video generation request (`POST /api/v1/services/aigc/video-generation/video-synthesis`).
type AlibabaVideoGenerationRequest struct {
	Input map[string]ProviderJsonValue `json:"input"`
	Model string `json:"model"`
	Parameters map[string]ProviderJsonValue `json:"parameters"`
}

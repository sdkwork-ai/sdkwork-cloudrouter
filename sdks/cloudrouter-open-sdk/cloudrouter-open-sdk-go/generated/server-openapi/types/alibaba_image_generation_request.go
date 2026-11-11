package types

// Alibaba DashScope Wanx image generation request (`POST /api/v1/services/aigc/text2image/image-synthesis`).
type AlibabaImageGenerationRequest struct {
	Input map[string]ProviderJsonValue `json:"input"`
	Model string `json:"model"`
	Parameters map[string]ProviderJsonValue `json:"parameters"`
}

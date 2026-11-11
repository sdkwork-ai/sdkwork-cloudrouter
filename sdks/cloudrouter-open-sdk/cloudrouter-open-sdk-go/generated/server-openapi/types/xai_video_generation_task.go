package types

// xAI video task result (VideoResponse): poll GET /xai/v1/videos/{request_id}.
type XaiVideoGenerationTask struct {
	Error map[string]ProviderJsonValue `json:"error"`
	Model string `json:"model"`
	Progress int `json:"progress"`
	RequestId string `json:"request_id"`
	Status string `json:"status"`
	Usage XaiUsage `json:"usage"`
	Video XaiVideoUrl `json:"video"`
}

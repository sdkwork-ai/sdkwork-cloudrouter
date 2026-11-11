package types

// Alibaba DashScope speech synthesis response carrying the generated audio URL.
type AlibabaSpeechResponse struct {
	Code string `json:"code"`
	Message string `json:"message"`
	Output map[string]ProviderJsonValue `json:"output"`
	RequestId string `json:"request_id"`
	Usage map[string]ProviderJsonValue `json:"usage"`
}

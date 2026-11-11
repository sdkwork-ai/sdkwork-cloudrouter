package types

// Black Forest Labs asynchronous FLUX generation record.
type BlackForestLabsImageGenerationTask struct {
	Details map[string]ProviderJsonValue `json:"details"`
	Id string `json:"id"`
	PollingUrl string `json:"polling_url"`
	Progress float64 `json:"progress"`
	Result map[string]ProviderJsonValue `json:"result"`
	Status string `json:"status"`
}

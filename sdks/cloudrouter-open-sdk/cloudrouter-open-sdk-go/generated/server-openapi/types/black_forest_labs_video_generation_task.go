package types

// Black Forest Labs asynchronous FLUX video generation record; poll GET /black_forest_labs/v1/get_result until status is Ready.
type BlackForestLabsVideoGenerationTask struct {
	Details map[string]ProviderJsonValue `json:"details"`
	Id string `json:"id"`
	PollingUrl string `json:"polling_url"`
	Progress float64 `json:"progress"`
	Result map[string]ProviderJsonValue `json:"result"`
	Status string `json:"status"`
}

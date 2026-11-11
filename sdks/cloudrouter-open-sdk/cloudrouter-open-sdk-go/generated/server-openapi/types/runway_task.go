package types

// Runway generation task and its outputs.
type RunwayTask struct {
	CreatedAt string `json:"createdAt"`
	Failure string `json:"failure"`
	FailureCode string `json:"failureCode"`
	Id string `json:"id"`
	Output []string `json:"output"`
	Progress float64 `json:"progress"`
	Status string `json:"status"`
}

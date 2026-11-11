package types

// Runway task submission acknowledgement; poll the task through GET /runway/v1/tasks/{task_id}.
type RunwayTaskAccepted struct {
	EstimatedCost map[string]ProviderJsonValue `json:"estimatedCost"`
	Id string `json:"id"`
}

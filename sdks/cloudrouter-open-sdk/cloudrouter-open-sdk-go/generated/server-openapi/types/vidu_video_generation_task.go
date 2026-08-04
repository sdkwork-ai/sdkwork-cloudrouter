package types

// Vidu vidu video generation task schema exposed by Cloud Router vendor routing.
type ViduVideoGenerationTask struct {
	CreatedAt string `json:"created_at"`
	Creations []ViduCreation `json:"creations"`
	Model string `json:"model"`
	State string `json:"state"`
	TaskId string `json:"task_id"`
}

package types

// Vidu vidu image generation task schema exposed by Cloud Router vendor routing.
type ViduImageGenerationTask struct {
	CreatedAt string `json:"created_at"`
	Creations []ViduCreation `json:"creations"`
	Model string `json:"model"`
	State string `json:"state"`
	TaskId string `json:"task_id"`
}

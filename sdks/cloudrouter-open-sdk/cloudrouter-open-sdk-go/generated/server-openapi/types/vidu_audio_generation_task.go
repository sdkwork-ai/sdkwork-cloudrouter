package types

// Vidu vidu audio generation task schema exposed by Cloud Router vendor routing.
type ViduAudioGenerationTask struct {
	CreatedAt string `json:"created_at"`
	Creations []ViduCreation `json:"creations"`
	Credits int `json:"credits"`
	Duration int `json:"duration"`
	ErrCode string `json:"err_code"`
	Model string `json:"model"`
	Prompt string `json:"prompt"`
	Seed int `json:"seed"`
	State string `json:"state"`
	TaskId string `json:"task_id"`
}

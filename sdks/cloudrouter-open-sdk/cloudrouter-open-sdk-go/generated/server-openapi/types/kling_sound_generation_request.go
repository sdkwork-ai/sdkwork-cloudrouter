package types

// Kling text-to-sound-effect request.
type KlingSoundGenerationRequest struct {
	CallbackUrl string `json:"callback_url"`
	Duration float64 `json:"duration"`
	ExternalTaskId string `json:"external_task_id"`
	Prompt string `json:"prompt"`
}

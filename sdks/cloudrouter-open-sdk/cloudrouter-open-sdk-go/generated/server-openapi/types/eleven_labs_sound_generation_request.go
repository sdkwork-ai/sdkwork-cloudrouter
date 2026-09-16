package types

// Eleven labs sound generation request schema exposed by Cloud Router.
type ElevenLabsSoundGenerationRequest struct {
	DurationSeconds float64 `json:"duration_seconds"`
	Loop bool `json:"loop"`
	ModelId string `json:"model_id"`
	PromptInfluence float64 `json:"prompt_influence"`
	Text string `json:"text"`
}

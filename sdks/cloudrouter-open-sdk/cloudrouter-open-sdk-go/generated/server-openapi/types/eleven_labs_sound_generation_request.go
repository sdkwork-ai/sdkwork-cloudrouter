package types

// ElevenLabs sound-effect generation request (`POST /v1/sound-generation`).
type ElevenLabsSoundGenerationRequest struct {
	DurationSeconds float64 `json:"duration_seconds"`
	Loop bool `json:"loop"`
	ModelId string `json:"model_id"`
	PromptInfluence float64 `json:"prompt_influence"`
	Text string `json:"text"`
}

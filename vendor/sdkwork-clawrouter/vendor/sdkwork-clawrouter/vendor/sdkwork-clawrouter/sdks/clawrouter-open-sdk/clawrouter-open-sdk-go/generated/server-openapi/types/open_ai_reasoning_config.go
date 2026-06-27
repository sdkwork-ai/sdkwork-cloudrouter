package types

// OpenAI-compatible open ai reasoning config schema exposed by Claw Router.
type OpenAiReasoningConfig struct {
	Effort string `json:"effort"`
	Summary string `json:"summary"`
}

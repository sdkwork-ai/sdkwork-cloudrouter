package types

// OpenAI-compatible open ai reasoning config schema exposed by Cloud Router.
type OpenAiReasoningConfig struct {
	Effort string `json:"effort"`
	Summary string `json:"summary"`
}

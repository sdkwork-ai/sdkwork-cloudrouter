package types

// OpenAI-compatible open ai prediction config schema exposed by Cloud Router.
type OpenAiPredictionConfig struct {
	Content string `json:"content"`
	Type string `json:"type"`
}

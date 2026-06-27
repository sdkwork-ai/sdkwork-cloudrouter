package types

// OpenAI-compatible open ai prediction config schema exposed by Claw Router.
type OpenAiPredictionConfig struct {
	Content string `json:"content"`
	Type string `json:"type"`
}

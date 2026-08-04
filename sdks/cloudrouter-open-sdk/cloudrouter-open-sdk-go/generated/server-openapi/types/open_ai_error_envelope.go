package types

// OpenAI-compatible open ai error envelope schema exposed by Cloud Router.
type OpenAiErrorEnvelope struct {
	Error OpenAiError `json:"error"`
}

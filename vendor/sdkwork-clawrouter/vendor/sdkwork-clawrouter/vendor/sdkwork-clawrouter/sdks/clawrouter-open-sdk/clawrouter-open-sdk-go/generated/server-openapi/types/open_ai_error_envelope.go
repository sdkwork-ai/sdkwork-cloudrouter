package types

// OpenAI-compatible open ai error envelope schema exposed by Claw Router.
type OpenAiErrorEnvelope struct {
	Error OpenAiError `json:"error"`
}

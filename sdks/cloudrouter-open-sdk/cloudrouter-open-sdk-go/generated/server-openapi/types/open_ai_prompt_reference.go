package types

// OpenAI-compatible open ai prompt reference schema exposed by Cloud Router.
type OpenAiPromptReference struct {
	Id string `json:"id"`
	Variables map[string]ProviderJsonValue `json:"variables"`
	Version string `json:"version"`
}

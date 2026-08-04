package types

// OpenAI-compatible open ai named tool choice function schema exposed by Cloud Router.
type OpenAiNamedToolChoiceFunction struct {
	Name string `json:"name"`
}

package types

// OpenAI-compatible open ai named tool choice schema exposed by Cloud Router.
type OpenAiNamedToolChoice struct {
	Function OpenAiNamedToolChoiceFunction `json:"function"`
	Type string `json:"type"`
}

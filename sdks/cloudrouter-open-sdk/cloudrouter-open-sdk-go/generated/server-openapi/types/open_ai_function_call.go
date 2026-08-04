package types

// OpenAI-compatible open ai function call schema exposed by Cloud Router.
type OpenAiFunctionCall struct {
	Arguments string `json:"arguments"`
	Name string `json:"name"`
}

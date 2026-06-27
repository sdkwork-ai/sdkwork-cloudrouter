package types

// OpenAI-compatible open ai function call schema exposed by Claw Router.
type OpenAiFunctionCall struct {
	Arguments string `json:"arguments"`
	Name string `json:"name"`
}

package types

// OpenAI-compatible open ai tool call schema exposed by Claw Router.
type OpenAiToolCall struct {
	Function OpenAiFunctionCall `json:"function"`
	Id string `json:"id"`
	Type string `json:"type"`
}

package types

// OpenAI-compatible open ai response output item schema exposed by Claw Router.
type OpenAiResponseOutputItem struct {
	Content []OpenAiResponseOutputContent `json:"content"`
	Id string `json:"id"`
	Role string `json:"role"`
	Status string `json:"status"`
	Type string `json:"type"`
}

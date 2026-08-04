package types

// OpenAI-compatible open ai response input item schema exposed by Cloud Router.
type OpenAiResponseInputItem struct {
	Content string `json:"content"`
	Id string `json:"id"`
	Role string `json:"role"`
	Status string `json:"status"`
	Type string `json:"type"`
}

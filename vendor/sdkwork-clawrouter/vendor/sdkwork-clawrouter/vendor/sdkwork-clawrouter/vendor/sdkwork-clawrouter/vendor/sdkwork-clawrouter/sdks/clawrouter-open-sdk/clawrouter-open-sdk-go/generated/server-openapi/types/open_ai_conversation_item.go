package types

// OpenAI-compatible open ai conversation item schema exposed by Claw Router.
type OpenAiConversationItem struct {
	Content []OpenAiConversationContentPart `json:"content"`
	CreatedAt int `json:"created_at"`
	Id string `json:"id"`
	Metadata map[string]string `json:"metadata"`
	Object string `json:"object"`
	Role string `json:"role"`
	Status string `json:"status"`
	Type string `json:"type"`
}

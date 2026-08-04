package types

// OpenAI-compatible open ai conversation schema exposed by Cloud Router.
type OpenAiConversation struct {
	CreatedAt int `json:"created_at"`
	Id string `json:"id"`
	Metadata map[string]string `json:"metadata"`
	Object string `json:"object"`
}

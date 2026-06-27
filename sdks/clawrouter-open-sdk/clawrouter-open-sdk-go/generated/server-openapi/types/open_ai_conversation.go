package types

// OpenAI-compatible open ai conversation schema exposed by Claw Router.
type OpenAiConversation struct {
	CreatedAt int `json:"created_at"`
	Id string `json:"id"`
	Metadata map[string]string `json:"metadata"`
	Object string `json:"object"`
}

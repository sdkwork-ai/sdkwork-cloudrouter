package types

// OpenAI-compatible open ai conversation create request schema exposed by Cloud Router.
type OpenAiConversationCreateRequest struct {
	Items []OpenAiConversationItemCreateRequest `json:"items"`
	Metadata map[string]string `json:"metadata"`
}

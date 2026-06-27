package types

// OpenAI-compatible open ai conversation create request schema exposed by Claw Router.
type OpenAiConversationCreateRequest struct {
	Items []OpenAiConversationItemCreateRequest `json:"items"`
	Metadata map[string]string `json:"metadata"`
}

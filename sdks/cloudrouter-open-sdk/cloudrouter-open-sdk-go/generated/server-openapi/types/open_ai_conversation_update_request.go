package types

// OpenAI-compatible open ai conversation update request schema exposed by Cloud Router.
type OpenAiConversationUpdateRequest struct {
	Metadata map[string]string `json:"metadata"`
}

package types

// OpenAI-compatible open ai conversation update request schema exposed by Claw Router.
type OpenAiConversationUpdateRequest struct {
	Metadata map[string]string `json:"metadata"`
}

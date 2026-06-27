package types

// OpenAI-compatible open ai conversation item create request schema exposed by Claw Router.
type OpenAiConversationItemCreateRequest struct {
	Content []OpenAiConversationContentPart `json:"content"`
	Metadata map[string]string `json:"metadata"`
	Role string `json:"role"`
	Type string `json:"type"`
}

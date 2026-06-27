package types

// Chat conversation list response schema exposed by Claw Router.
type ChatConversationListResponse struct {
	Items []ChatConversationItem `json:"items"`
}

package types

// Chat message list response schema exposed by Claw Router.
type ChatMessageListResponse struct {
	Items []ChatMessageItem `json:"items"`
}

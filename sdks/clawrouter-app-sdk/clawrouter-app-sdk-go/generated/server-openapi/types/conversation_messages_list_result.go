package types

// Conversation messages list result schema exposed by Claw Router.
type ConversationMessagesListResult struct {
	Code string `json:"code"`
	Data ChatMessageListResponse `json:"data"`
	Msg string `json:"msg"`
}

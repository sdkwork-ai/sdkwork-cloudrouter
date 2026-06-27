package types

// Conversations create result schema exposed by Claw Router.
type ConversationsCreateResult struct {
	Code string `json:"code"`
	Data ChatConversationResponse `json:"data"`
	Msg string `json:"msg"`
}

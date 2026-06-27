package types

// Conversations list result schema exposed by Claw Router.
type ConversationsListResult struct {
	Code string `json:"code"`
	Data ChatConversationListResponse `json:"data"`
	Msg string `json:"msg"`
}

package types

// Conversations retrieve result schema exposed by Claw Router.
type ConversationsRetrieveResult struct {
	Code string `json:"code"`
	Data ChatConversationItem `json:"data"`
	Msg string `json:"msg"`
}

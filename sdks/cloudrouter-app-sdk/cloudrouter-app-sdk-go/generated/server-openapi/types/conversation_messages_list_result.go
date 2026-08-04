package types

// Conversation messages list result schema exposed by Cloud Router.
type ConversationMessagesListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}

package types

// Conversations create result schema exposed by Cloud Router.
type ConversationsCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}

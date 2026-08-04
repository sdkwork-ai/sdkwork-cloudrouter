package types

// Conversations retrieve result schema exposed by Cloud Router.
type ConversationsRetrieveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}

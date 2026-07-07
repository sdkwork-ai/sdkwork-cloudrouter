package types

// Notifications acknowledge create result schema exposed by Claw Router.
type NotificationsAcknowledgeCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}

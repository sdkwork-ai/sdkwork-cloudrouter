package types

// Notifications popup seen create result schema exposed by Cloud Router.
type NotificationsPopupSeenCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}

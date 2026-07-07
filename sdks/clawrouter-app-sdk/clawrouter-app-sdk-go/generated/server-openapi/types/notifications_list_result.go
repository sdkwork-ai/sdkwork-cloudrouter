package types

// Notifications list result schema exposed by Claw Router.
type NotificationsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}

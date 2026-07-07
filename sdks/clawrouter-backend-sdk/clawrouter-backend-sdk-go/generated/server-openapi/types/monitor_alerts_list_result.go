package types

// Monitor alerts list result schema exposed by Claw Router.
type MonitorAlertsListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
